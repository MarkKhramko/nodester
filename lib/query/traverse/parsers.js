/**
 * nodester
 * MIT Licensed
 */

'use strict';

const { Op } = require('sequelize');
const { DataTypes } = require('sequelize');


module.exports = {
	parseValue: _parseValue,
	parseWhereEntry: _parseWhereEntry,
}

function _parseValue(value, attribute, model) {
	// If value is Object:
	if (value !== null && typeof value === 'object' && Array.isArray(value) === false) {
		// Dates and other Sequelize-compatible values are scalar values, not
		// operator maps. Only plain objects can contain operator keys.
		const prototype = Object.getPrototypeOf(value);
		if (prototype !== Object.prototype && prototype !== null) return value;

		// Combine all OPs into one query:
		const allOPs = {};
		const entries = [
			...Object.entries(value),
			...Object.getOwnPropertySymbols(value).map(symbol => [symbol, value[symbol]]),
		];
		for (const [opKey, rawValue] of entries) {
			const op = typeof opKey === 'symbol' ? opKey : Op[opKey];
			if (!op) {
				throw new Error(`Unsupported Sequelize operator '${opKey}'.`);
			}

			let _value = rawValue;

			// Sequilize does not allow Op comparisons of dates
			// without converting the value to the Date object:
			const typeKey = model.tableAttributes[attribute]?.type?.key;
			switch (typeKey) {
				case DataTypes.DATE.key:
				case DataTypes.DATEONLY.key:
					const parse = (val) => {
						if (!val) return null;
						let d = new Date(val);
						if (isNaN(d.valueOf()) && typeof val === 'string') {
							// Try to fix common space/plus-instead-of-T issue:
							d = new Date(val.trim().replace(/[ +]/g, 'T'));
						}
						if (isNaN(d.valueOf())) {
							const err = new Error(`nodester: Invalid date value '${val}' for attribute '${attribute}'`);
							throw err;
						}
						return d;
					};

					if (Array.isArray(rawValue)) {
						if (
							op === Op.in
							|| op === Op.notIn
							|| op === Op.between
							|| op === Op.notBetween
						) {
							_value = rawValue.map(v => parse(v));
						} else {
							_value = parse(rawValue[0]);
						}
					} else {
						_value = parse(rawValue);
					}
					break;

				default:
					break;
			}

			allOPs[op] = _value;
		}
		return allOPs;
	}

	return value;
}

function _parseWhereEntry(attribute, value, whereHolder, model) {
	let _value = value;

	// Sequelize logical operators are symbol keys. Parse their child objects
	// recursively so date and other typed values are still normalized.
	if (typeof attribute === 'symbol') {
		if (![Op.and, Op.or, Op.not].includes(attribute)) {
			throw new Error(`Unsupported Sequelize operator '${attribute.toString()}'.`);
		}

		const parseChild = (child) => {
			if (Array.isArray(child)) return child.map(parseChild);
			if (!child || typeof child !== 'object') return child;
			const parsed = {};
			for (const [childAttribute, childValue] of [
				...Object.entries(child),
				...Object.getOwnPropertySymbols(child).map(symbol => [symbol, child[symbol]]),
			]) {
				_parseWhereEntry(childAttribute, childValue, parsed, model);
			}
			return parsed;
		};

		whereHolder[attribute] = parseChild(value);
		return;
	}

	// If attribute is Op (not, like, or, etc.):
	if (attribute in Op) {
		// Parse value:
		_value = _parseValue(_value, attribute, model);

		const op = Op[attribute];
		whereHolder[op] = _value;
		return;
	}

	whereHolder[attribute] = _parseValue(_value, attribute, model);
}

