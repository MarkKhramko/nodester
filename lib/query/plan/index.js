/**
 * First-class NQL query plan.
 *
 * `traverse()` remains the compatibility compiler. This module adds the
 * execution boundary needed by cursor pagination and keeps page metadata
 * close to the query that produced it.
 */
'use strict';

const traverse = require('../traverse');
const {
	normalizeOrder,
	encodeCursor,
	assertCursorCodec,
	queryScope,
} = require('./cursor');
const { resolveConstraint } = require('./policy');

function createQueryPlan(queryNode, filter, options = {}) {
	const model = options.model ?? filter.model;
	const context = options.context ?? {};
	const query = traverse(queryNode, filter, model, null, context);
	const pagination = filter.pagination;
	if (!pagination || pagination.mode !== 'cursor') {
		return {
			ast: queryNode,
			model,
			query,
			pagination: null,
			execute: (executeOptions) => executeLegacy(model, query, executeOptions),
		};
	}

	const codec = assertCursorCodec(pagination.codec);
	const order = normalizeOrder(pagination, model, filter);
	const scope = queryScope(queryNode, resolveConstraint(filter, null, context), order);
	const requestedLimitValue = queryNode.limit > 0
		? queryNode.limit
		: filter.statics?.clauses?.limit ?? filter.bounds?.clauses?.limit?.max ?? 20;
	const requestedLimit = Number(requestedLimitValue);
	const pageSize = Math.max(1, Math.min(requestedLimit, pagination.maxPageSize ?? filter.bounds?.clauses?.limit?.max ?? 100));
	const hiddenCursorAttributes = order
		.map(({ field }) => field)
		.filter((field) => !(queryNode.attributes ?? []).includes(field));
	query.limit = pageSize + 1;

	return {
		ast: queryNode,
		model,
		query,
		pagination: {
			mode: 'cursor',
			pageSize,
			order,
		scope,
			after: queryNode.after,
			before: queryNode.before,
			hiddenCursorAttributes,
		},
		execute: (executeOptions) => executeCursorPlan({
			model,
			query,
			codec,
			order,
			scope,
			pageSize,
			after: queryNode.after,
			before: queryNode.before,
			executeOptions,
		}),
	};
}

async function executeLegacy(model, query, executeOptions = {}) {
	const findAll = executeOptions.findAll ?? model.findAll.bind(model);
	const items = await findAll(query);
	return { items, pageInfo: null };
}

async function executeCursorPlan(plan) {
	const findAll = plan.executeOptions?.findAll ?? plan.model.findAll.bind(plan.model);
	const rows = await findAll(plan.query);
	const hasExtra = rows.length > plan.pageSize;
	let items = rows.slice(0, plan.pageSize);
	if (plan.before) items = items.reverse();

	const cursorFor = (row) => {
		const values = {};
		for (const { field } of plan.order) {
			values[field] = typeof row?.get === 'function' ? row.get(field) : row?.[field];
		}
		return encodeCursor(plan.codec, plan.model, plan.order, values, plan.scope);
	};

	const hasPreviousPage = plan.before ? hasExtra : Boolean(plan.after);
	const hasNextPage = plan.before ? Boolean(plan.before) : hasExtra;
	return {
		items,
		pageInfo: {
			hasNextPage,
			hasPreviousPage,
			nextCursor: items.length > 0 && hasNextPage ? cursorFor(items[items.length - 1]) : null,
			previousCursor: items.length > 0 && hasPreviousPage ? cursorFor(items[0]) : null,
		},
	};
}

module.exports = createQueryPlan;
module.exports.createQueryPlan = createQueryPlan;
module.exports.executeCursorPlan = executeCursorPlan;
