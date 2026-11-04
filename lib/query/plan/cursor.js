/**
 * Cursor planning primitives. Kept separate from the NQL parser so callers
 * constructing ASTs programmatically get the same validation and predicates.
 */
'use strict';

const { Op, DataTypes } = require('sequelize');
const { NodesterQueryError } = require('nodester/errors');
const { CURSOR_VERSION, assertCursorCodec } = require('../cursor');

function primaryKeyFor(model) {
	if (Array.isArray(model.primaryKeyAttributes) && model.primaryKeyAttributes.length === 1) {
		return model.primaryKeyAttributes[0];
	}
	if (typeof model.primaryKeyAttribute === 'string') return model.primaryKeyAttribute;
	if (model.tableAttributes.id) return 'id';
	const key = Object.entries(model.tableAttributes).find(([, definition]) => definition.primaryKey);
	return key?.[0];
}

function normalizeOrder(pagination, model, filter) {
	const configured = pagination?.order;
	if (!Array.isArray(configured) || configured.length === 0) {
		throw queryError('Cursor pagination requires a non-empty pagination.order array.');
	}

	const allowed = new Set(filter.attributes ?? Object.keys(model.tableAttributes));
	const nonNull = new Set(pagination.nonNull ?? pagination.nonNullOrderFields ?? []);
	const order = configured.map((entry) => {
		if (!entry || typeof entry.field !== 'string') {
			throw queryError('Each cursor order entry must contain a field.');
		}
		if (!allowed.has(entry.field) || !model.tableAttributes[entry.field]) {
			throw queryError(`Cursor order field '${entry.field}' is not allowed.`);
		}
		const direction = String(entry.direction ?? 'ASC').toUpperCase();
		if (direction !== 'ASC' && direction !== 'DESC') {
			throw queryError(`Invalid cursor order direction '${entry.direction}'.`);
		}
		const definition = model.tableAttributes[entry.field];
		if (definition.allowNull === true && !nonNull.has(entry.field)) {
			throw queryError(`Cursor order field '${entry.field}' is nullable; use a non-null order field or materialize a non-null value.`);
		}
		return { field: entry.field, direction };
	});

	const unique = Array.isArray(pagination.unique) ? pagination.unique : [];
	for (const field of unique) {
		if (!allowed.has(field) || !model.tableAttributes[field]) {
			throw queryError(`Cursor unique field '${field}' is not allowed.`);
		}
	}

	const key = primaryKeyFor(model);
	if (unique.length === 0 && !key) {
		throw queryError('Cursor order must declare unique fields when the model has no single primary key.');
	}
	const tieBreakers = unique.length > 0 ? unique : [key];
	for (const field of tieBreakers) {
		if (!order.some((item) => item.field === field)) {
			order.push({ field, direction: order[order.length - 1]?.direction ?? 'ASC' });
		}
	}

	return order;
}

function serializeValue(value, definition) {
	if (value === undefined) throw queryError('Cursor row is missing an order value.');
	if (value === null) throw queryError('Cursor order values cannot be null.');
	const typeKey = definition?.type?.key;
	if (typeKey === DataTypes.DATE.key || typeKey === DataTypes.DATEONLY.key) {
		const date = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(date.valueOf())) throw queryError('Cursor contains an invalid date value.');
		return { type: 'date', value: date.toISOString() };
	}
	if (typeKey === 'BIGINT' || typeKey === 'DECIMAL') {
		return { type: typeKey.toLowerCase(), value: String(value) };
	}
	if (['INTEGER', 'FLOAT', 'DOUBLE'].includes(typeKey)) {
		const number = Number(value);
		if (!Number.isFinite(number)) throw queryError('Cursor contains an invalid numeric value.');
		return { type: 'number', value: number };
	}
	return { type: 'value', value };
}

function deserializeValue(value, definition) {
	if (value === null || value === undefined) return value;
	if (!value || typeof value !== 'object' || typeof value.type !== 'string') {
		throw queryError('Cursor value is malformed.');
	}
	if (value.type === 'date') {
		const date = new Date(value.value);
		if (Number.isNaN(date.valueOf())) throw queryError('Cursor contains an invalid date value.');
		return date;
	}
	if (value.type === 'number') {
		if (!Number.isFinite(Number(value.value))) throw queryError('Cursor contains an invalid numeric value.');
		return Number(value.value);
	}
	if (value.type === 'bigint' || value.type === 'decimal') return String(value.value);
	if (value.type !== 'value') throw queryError('Cursor value type is unsupported.');
	return value.value;
}

function normalizeCursorValue(value, field, model) {
	return deserializeValue(value, model.tableAttributes[field]);
}

function encodeCursor(codec, model, order, values, scope) {
	const payload = {
		v: CURSOR_VERSION,
		model: modelIdentity(model),
		order,
		scope,
		values: order.map(({ field }) => serializeValue(values[field], model.tableAttributes[field])),
	};
	return codec.encode(payload);
}

function decodeCursor(codec, cursor, model, order, scope) {
	let payload;
	try {
		payload = codec.decode(cursor);
	}
	catch (error) {
		throw queryError(`Invalid cursor: ${error.message}`);
	}
	if (!payload || payload.v !== CURSOR_VERSION) throw queryError('Cursor version is not supported.');
	if (payload.model !== modelIdentity(model)) throw queryError('Cursor model does not match this query.');
	if (JSON.stringify(payload.order) !== JSON.stringify(order)) throw queryError('Cursor order does not match this query.');
	if (payload.scope !== scope) throw queryError('Cursor query scope does not match this query.');
	if (!Array.isArray(payload.values) || payload.values.length !== order.length) throw queryError('Cursor values do not match this order.');
	return order.map(({ field }, index) => normalizeCursorValue(payload.values[index], field, model));
}

function buildCursorPredicate(order, values, direction) {
	const branches = order.map((entry, index) => {
		const equal = order.slice(0, index).map(({ field }, previous) => ({
			[field]: values[previous]
		}));
		const isAfter = direction === 'after';
		const forward = entry.direction === 'ASC' ? Op.gt : Op.lt;
		const backward = entry.direction === 'ASC' ? Op.lt : Op.gt;
		return {
			[Op.and]: [
				...equal,
				{ [entry.field]: { [isAfter ? forward : backward]: values[index] } }
			]
		};
	});
	return { [Op.or]: branches };
}

function reverseOrder(order) {
	return order.map(({ field, direction }) => [field, direction === 'ASC' ? 'DESC' : 'ASC']);
}

function modelIdentity(model) {
	const name = model.options?.name;
	return model.tableName?.toString?.() ?? name?.singular ?? name?.plural ?? 'model';
}

function queryScope(queryNode, constraint, order) {
	const stable = (value) => {
		if (value === undefined) return null;
		if (Array.isArray(value)) return value.map(stable);
		if (value instanceof Date) return value.toISOString();
		if (value && typeof value === 'object') {
			const result = Object.keys(value).sort().reduce((resultObject, key) => {
				resultObject[key] = stable(value[key]);
				return resultObject;
			}, {});
			for (const symbol of Object.getOwnPropertySymbols(value)) {
				result[symbol.toString()] = stable(value[symbol]);
			}
			return result;
		}
		return value;
	};
	return JSON.stringify(stable({
		where: queryNode.where ?? {},
		constraints: constraint?.where ?? {},
		includes: constraint?.includes ?? {},
		order,
	}));
}

function queryError(message) {
	const error = new NodesterQueryError(message);
	error.status = 422;
	return error;
}

module.exports = {
	normalizeOrder,
	serializeValue,
	decodeCursor,
	encodeCursor,
	buildCursorPredicate,
	reverseOrder,
	modelIdentity,
	queryScope,
	assertCursorCodec,
};
