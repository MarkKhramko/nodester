/**
 * nodester
 * MIT Licensed
 */

'use strict';

const BOUNDS = require('../../constants/Bounds');
const { Op } = require('sequelize');

const { NodesterQueryError } = require('nodester/errors');
const httpCodes = require('nodester/http/codes');

const { ensure } = require('nodester/validators/arguments');

// Mappers & parsers:
const mapCOUNT = require('./mappers/functions/count');
const mapAGG = require('./mappers/functions/aggregate');

const {
	parseValue,
	parseWhereEntry,
} = require('./parsers');
// Mappers & parsers\

const {
	disassembleQueryNode,
	addAssociationQuery,
} = require('./utils');

const {
	getModelAssociationProps
} = require('../../utils/modelAssociations.util');

const consl = require('nodester/loggers/console');
const {
	normalizeOrder,
	decodeCursor,
	buildCursorPredicate,
	reverseOrder,
	assertCursorCodec,
	queryScope,
} = require('../plan/cursor');
const { resolveConstraint } = require('../plan/policy');


module.exports = traverse;
Object.defineProperty(traverse, 'plan', {
	enumerable: true,
	get: () => require('../plan'),
});

/**
 *
 * @param {ModelsTreeNode} queryNode
 * @param {NodesterFilter} filter
 * @param {Model} model
 * @param {Object} association (optional)
 *
 * @access public
 */
function traverse(queryNode, filter = null, model = null, association = null, context = {}, inheritedConstraints = null) {
	const _model = model ?? filter.model;

	try {
		ensure(queryNode, 'object,required', 'queryNode');
		ensure(filter, 'object,required', 'filter');
		if (!_model) {
			const err = new TypeError(`'model' must be provided either in 'filter.model' or as a third argument.`);
			throw err;
		}
	}
	catch (error) {
		Error.captureStackTrace(error, traverse);
		throw error;
	}

	const rootModelName = _model.options.name;
	const rootModelAssociations = _model.associations;
	const { sequelize } = _model;
	const attributesAvailable = Object.keys(_model.tableAttributes);
	const filterIncludes = filter.includes ?? {};
	const pagination = filter.pagination ?? null;
	const constraint = resolveConstraint(filter, inheritedConstraints, context);

	const newQuery = {
		attributes: [],
		where: {},
		include: []
	};

	const {
		attributes,
		clauses,
		functions,
		where,

		includes,
		required,
		after,
		before,
	} = disassembleQueryNode(queryNode);

	if (pagination?.mode === 'cursor' && association) {
		throw queryError('Cursor pagination is supported only on the root query.');
	}

	// If this include is marked as required (root filtering via ^),
	// set it on the query:
	if (required) {
		newQuery.required = true;
	}
	else if (association) {
		// Preserve an explicitly optional policy so Sequelize's association
		// defaults cannot turn a constrained LEFT JOIN into an INNER JOIN.
		newQuery.required = false;
	}


	// Attribute:
	//
	//	If Filter is not set,
	//	use every available attribute:
	const isAggregateQuery = functions.length > 0 && clauses.group_by;
	const selectAllByDefault = attributes.length === 0 && !isAggregateQuery;

	if (filter === null) {
		for (let attribute of attributesAvailable) {
			// If no query filter or attribute is requested:
			if (selectAllByDefault || attributes.indexOf(attribute) > -1) {
				newQuery.attributes.push(attribute);
				continue;
			}
		}
	}
	//	Filter is present:
	else {
		// If no query attributes were set,
		//	use the ones from Filter,
		// If query attributes were set,
		//	put them through Filter:
		for (let attribute of filter.attributes) {
			if (attributesAvailable.indexOf(attribute) === -1) {
				const err = new NodesterQueryError(`Field '${attribute}' is not present in model.`);
				Error.captureStackTrace(err, traverse);
				throw err;
			}

			// If attribute is not in available set:
			// if (filter.attributes.indexOf(attribute) === -1) {
			// 	continue;
			// }

			// If no query filter or attribute is requested:
			if (selectAllByDefault || attributes.indexOf(attribute) > -1) {
				newQuery.attributes.push(attribute);
				continue;
			}
		}
	}

	// At least 1 attribute is mandatory
	// or "functions" must be set:
	if (
		functions.length === 0
		&&
		newQuery.attributes.length === 0
	) {
		const err = new NodesterQueryError(`No attributes were selected.`);
		Error.captureStackTrace(err, traverse);
		throw err;
	}
	// Attribute\

	// Functions:
	for (const fnParams of functions) {
		const fnName = fnParams.fn;

		const isAllowed = filter.functions.indexOf(fnName) > -1;

		if (!isAllowed) {
			const err = new NodesterQueryError(`Function '${fnName}' is not allowed.`);
			Error.captureStackTrace(err, traverse);
			throw err;
		}

		switch (fnName) {
			// SQL COUNT():
			case 'count': {
				mapCOUNT(
					fnParams,
					_model,
					filter?.includes,

					newQuery
				);
				break;
			}
			// SQL SUM(), AVG(), MIN(), MAX():
			case 'sum':
			case 'avg':
			case 'min':
			case 'max': {
				mapAGG(
					fnParams,
					_model,
					filter?.includes,
					newQuery,
					filter?.attributes
				);
				break;
			}
			// Any other function:
			default:
				consl.warn(`function ${fnName}() is not supported`);
				break;
		}
	}
	// Functions\

	// Clauses:
	const order = {};

	const clausesEntries = Object.entries(clauses);
	for (const [clauseName, value] of clausesEntries) {
		if (value === undefined) continue;
		// ModelsTreeNode uses -1 and 0 as the absence markers for limit and
		// skip. They must not become implicit child-query clauses (or be
		// rejected by a filter that intentionally exposes no pagination).
		if (clauseName === 'limit' && value === -1) continue;
		if (clauseName === 'skip' && value === 0) continue;

		// If clause is not available:
		if (filter != null) {
			if (filter.clauses.indexOf(clauseName) === -1) {
				throw queryError(`Clause '${clauseName}' is not allowed.`);
			}
		}

		switch (clauseName) {
			case 'group_by': {
				if (typeof value === 'undefined') {
					continue;
				}

				const groupFields = Array.isArray(value) ? value : [value];
				for (const field of groupFields) {
					if (typeof _model.tableAttributes[field] === 'undefined' || !filter.attributes.includes(field)) {
						const err = new NodesterQueryError(`group_by '${field}' is not allowed.`);
						Error.captureStackTrace(err, traverse);
						throw err;
					}

					// For aggregate queries, group_by field MUST be in attributes:
					if (newQuery.attributes.indexOf(field) === -1) {
						newQuery.attributes.push(field);
					}
				}

				newQuery.group = value;
				continue;
			}

			case 'limit': {
				const _value = _setValueWithBounds(value, 'number', filter.bounds?.clauses?.limit);

				// Do not set if negative:
				if (_value < 0)
					continue;

				newQuery.limit = _value;
				continue;
			}
			case 'skip': {
				const _value = _setValueWithBounds(value, 'number', filter.bounds?.clauses?.skip);

				// Do not set if 0 or negative:
				if (_value <= 0)
					continue;

				newQuery.offset = _value;
				continue;
			}
			case 'order':
				if (value === undefined)
					continue;

				order.order = value;
				continue;

			case 'order_by':
				if (value === undefined)
					continue;

				order.by = value;
				continue;

			default:
				throw queryError(`Unsupported query clause '${clauseName}'.`);
		}
	}

	//	Override clauses with "statics":
	if (filter !== null) {
		const staticClausesEntries = Object.entries(filter.statics?.clauses ?? {});

		for (let entry of staticClausesEntries) {
			const [clauseName, staticClauseValue] = entry;

			switch (clauseName) {
				case 'group_by':
					newQuery.group = staticClauseValue;
					continue;

				case 'limit':
					newQuery.limit = staticClauseValue;
					continue;

				case 'skip':
					newQuery.offset = staticClauseValue;
					continue;

				case 'order':
					order.order = staticClauseValue;
					continue;

				case 'order_by':
					order.by = staticClauseValue;
					continue;

				default:
					break;
			}
		}
	}

	// Check for undefined clauses:
	if (newQuery.limit === undefined && typeof filter.bounds?.clauses?.limit === 'object') {
		newQuery.limit = filter.bounds.clauses.limit.max ?? BOUNDS.limit.max;
	}
	// Clauses\


	// Order:
	if (pagination?.mode === 'cursor') {
		const cursorOrder = normalizeOrder(pagination, _model, filter);
		if (order.order !== undefined || order.by !== undefined) {
			const requested = _normalizeClientOrder(order);
			if (requested && JSON.stringify(requested) !== JSON.stringify(cursorOrder)) {
				throw queryError('Client ordering cannot override cursor pagination ordering.');
			}
		}
		newQuery.order = cursorOrder.map(({ field, direction }) => [field, direction]);
		for (const { field } of cursorOrder) {
			if (!newQuery.attributes.includes(field)) newQuery.attributes.push(field);
		}
		if (after !== undefined && before !== undefined) {
			throw queryError("'after' and 'before' cannot be used together.");
		}
		if ((after !== undefined || before !== undefined) && newQuery.offset !== undefined) {
			throw queryError("'skip' cannot be combined with cursor pagination.");
		}
		const cursor = after ?? before;
		if (cursor !== undefined) {
			const codec = assertCursorCodec(pagination.codec);
			const scope = queryScope(queryNode, constraint, cursorOrder);
			const values = decodeCursor(codec, cursor, _model, cursorOrder, scope);
			const predicate = buildCursorPredicate(cursorOrder, values, after !== undefined ? 'after' : 'before');
			newQuery.where = _andWhere(newQuery.where, predicate);
			if (before !== undefined) newQuery.order = reverseOrder(cursorOrder);
		}
	}
	else if (
		order.order === 'rand'
		||
		order.order === 'random'
	) {
		newQuery.order = sequelize.random();
	}
	else {
		if (order.by !== undefined && !attributesAvailable.includes(order.by)) {
			throw queryError(`Order field '${order.by}' is not allowed.`);
		}
		if (order.by !== undefined && !filter.attributes.includes(order.by)) {
			throw queryError(`Order field '${order.by}' is not allowed by the Filter.`);
		}
		if (order.order !== undefined && !['asc', 'desc', 'ASC', 'DESC', 'max-asc', 'max', 'min-desc', 'min', 'min-asc', 'max-desc'].includes(order.order)) {
			throw queryError(`Order direction '${order.order}' is not supported.`);
		}
		const column = sequelize.col(order.by);
		switch (order.order) {
			// MAX/MIN:
			case 'max-asc':
			case 'max':
			case 'min-desc':
				newQuery.order = sequelize.fn('max', column);
				break;
			case 'min':
			case 'min-asc':
			case 'max-desc':
				newQuery.order = [sequelize.fn('max', column), 'DESC'];
				break;
			// MAX/MIN\

			case null:
			case undefined:
				// newQuery.order = [ ['id', 'desc'] ];
				break;

			default:
				newQuery.order = [[order.by, order.order]];
				break;
		}
	}
	// Order\


	// Includes:
	// 	Validate, if requested includes are available:
	for (let include of includes) {
		const includeName = include.model;

		if (rootModelAssociations[includeName] === undefined) {
			const err = new NodesterQueryError(`No include named '${includeName}'`);
			Error.captureStackTrace(err, traverse);
			throw err;
		}
		if (!filterIncludes[includeName]) {
			throw queryError(`Include '${includeName}' is not allowed.`);
		}
	}

	_traverseIncludes(includes, _model, filter, newQuery, context, constraint.includes)
	if (pagination?.mode === 'cursor' && !association) _protectRootPagination(newQuery, _model);
	// Includes\


	// Where:

	//	Set aatributes from Query:
	const parsedClientWhere = {};
	const whereEntries = _whereEntries(where);
	for (const [attribute, value] of whereEntries) {
		_validateWhereEntry(attribute, value, filter, _model);
		parseWhereEntry(attribute, value, parsedClientWhere, _model);
	}
	Object.assign(newQuery.where, parsedClientWhere);

	// Static attributes and constraints are mandatory predicates. Keep the
	// legacy direct keys for simple statics, but also add a logical AND so a
	// client predicate can never replace one by assignment or OR nesting.
	const staticAttributesEntries = Object.entries(filter.statics?.attributes ?? {});
	for (const [attribute, staticValue] of staticAttributesEntries) {
		_validateField(attribute, filter, _model, 'static constraint');
		newQuery.where[attribute] = parseValue(staticValue, attribute, _model);
	}
	const mandatory = {};
	for (const [attribute, value] of _whereEntries(constraint.where ?? {})) {
		_validateWhereEntry(attribute, value, filter, _model);
		parseWhereEntry(attribute, value, mandatory, _model);
		if (!(attribute in newQuery.where)) newQuery.where[attribute] = mandatory[attribute];
	}
	const clientWhere = { ...parsedClientWhere };
	for (const symbol of Object.getOwnPropertySymbols(newQuery.where)) clientWhere[symbol] = newQuery.where[symbol];
	if (Object.keys(mandatory).length > 0 || staticAttributesEntries.length > 0) {
		const predicates = [];
		if (Object.keys(clientWhere).length > 0 || Object.getOwnPropertySymbols(clientWhere).length > 0) predicates.push(clientWhere);
		if (staticAttributesEntries.length > 0) {
			const staticWhere = {};
			for (const [attribute] of staticAttributesEntries) staticWhere[attribute] = newQuery.where[attribute];
			predicates.push(staticWhere);
		}
		if (Object.keys(mandatory).length > 0) predicates.push(mandatory);
		if (predicates.length > 1) newQuery.where[Op.and] = predicates;
	}

	//	If "where" was not set in any way,
	// 	remove it from the db query:
	if (
		Object.keys(newQuery.where).length === 0
		&& Object.getOwnPropertySymbols(newQuery.where).length === 0
	) {
		delete newQuery.where;
	}
	// Where\

	// Combine included orders into one at the top level:
	// - Why?
	// - Sequelize ignores included orders for association types like:
	//   • HasMany
	_traverseIncludedOrders(newQuery, _model);

	return newQuery;
}


/**
 * Traverses each include in the array.
 *
 * @param {Array} includes
 * @param {Model} rootModel
 * @param {NodesterFilter} filter
 * @param {Object} resultQuery
 *
 * @access private
 */
function _traverseIncludes(includes, rootModel, filter, resultQuery, context, constraintIncludes = {}) {
	const filterIncludesEntries = Object.entries(filter.includes ?? {});
	const requestedIncludes = new Map(includes.map(include => [include.model, include]));
	const names = new Set([
		...filterIncludesEntries.map(([includeName]) => includeName),
		...Object.keys(constraintIncludes ?? {})
	]);
	for (const includeName of names) {
		const includeFilter = filter.includes?.[includeName];

		const association = rootModel.associations[includeName];

		// If no such association:
		if (!association) {
			const err = new NodesterQueryError(`No include named '${includeName}'`);
			Error.captureStackTrace(err, _traverseIncludes);
			throw err;
		}

		// If include was not requested:
		const policy = constraintIncludes?.[includeName];
		const include = requestedIncludes.get(includeName);
		if (!include && !policy) {
			continue;
		}
		if (!includeFilter) {
			throw queryError(`Required include '${includeName}' has no Filter configuration.`);
		}
		if (!include && policy === false) {
			continue;
		}

		const includeModel = association.target;
		const includeNode = include ?? {
			model: includeName,
			attributes: [],
			functions: [],
			where: {},
			includes: [],
			required: policy?.required === true,
		};
		if (policy?.required === true) includeNode.required = true;
		// Build query for this include.
		const associationQuery = traverse(
			includeNode,
			includeFilter,
			includeModel,
			association,
			context,
			policy
		);

		addAssociationQuery(associationQuery, includeName, resultQuery, rootModel);
	}
}

function _validateField(field, filter, model, context) {
	if (typeof field !== 'string' || !model.tableAttributes[field] || !(filter.attributes ?? []).includes(field)) {
		throw queryError(`Field '${field}' is not allowed in ${context}.`);
	}
}

function _validateWhereEntry(attribute, value, filter, model) {
	const { Op } = require('sequelize');
	if (typeof attribute === 'symbol') {
		if (![Op.and, Op.or, Op.not].includes(attribute)) {
			throw queryError(`Invalid root where operator '${attribute.toString()}'.`);
		}
		const children = Array.isArray(value) ? value : [value];
		for (const child of children) {
			if (child && typeof child === 'object') {
				for (const [field, childValue] of _whereEntries(child)) {
					_validateWhereEntry(field, childValue, filter, model);
				}
			}
		}
		return;
	}
	if (attribute in Op) {
		if (!['and', 'or', 'not'].includes(attribute)) {
			throw queryError(`Invalid root where operator '${attribute}'.`);
		}
		if (Array.isArray(value)) {
			for (const child of value) {
				if (child && typeof child === 'object') {
					for (const [field, childValue] of _whereEntries(child)) _validateWhereEntry(field, childValue, filter, model);
				}
			}
		}
		return;
	}
	if (typeof attribute !== 'string' || !model.tableAttributes[attribute]) {
		throw queryError(`Field '${attribute}' is not present in the model.`);
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		for (const operator of Object.keys(value)) {
			if (!Op[operator]) throw queryError(`Invalid operator '${operator}' for field '${attribute}'.`);
		}
		for (const operator of Object.getOwnPropertySymbols(value)) {
			if (!Object.values(Op).includes(operator)) throw queryError(`Invalid operator for field '${attribute}'.`);
		}
	}
}

function _whereEntries(value) {
	return [
		...Object.entries(value),
		...Object.getOwnPropertySymbols(value).map(symbol => [symbol, value[symbol]]),
	];
}

function _protectRootPagination(query, model) {
	const collectionIncludes = query.include.filter(({ association }) => {
		const type = model.associations[association]?.associationType;
		return type === 'HasMany' || type === 'BelongsToMany';
	});

	// Optional HasMany children can be loaded separately. Once every root
	// collection is either separate or a non-duplicating association, a root
	// subquery is unnecessary and can break nested required joins: Sequelize may
	// render the nested join inside the subquery while resolving the parent
	// BelongsTo alias only in the outer query.
	for (const include of collectionIncludes) {
		const type = model.associations[include.association]?.associationType;
		if (type === 'HasMany' && include.required !== true) include.separate = true;
	}
	const hasJoinedCollection = collectionIncludes.some((include) => include.separate !== true);
	if (!hasJoinedCollection) return;

	// Required collections stay in the root subquery because they filter root
	// records and may duplicate root rows when joined.
	query.subQuery = true;
	query.distinct = true;
}

function _andWhere(left, right) {
	if (
		!left
		|| (Object.keys(left).length === 0 && Object.getOwnPropertySymbols(left).length === 0)
	) return right;
	return { [Op.and]: [left, right] };
}

function _normalizeClientOrder(order) {
	if (order.order === 'rand' || order.order === 'random') {
		throw queryError('Random ordering is not supported with cursor pagination.');
	}
	if (!order.by) return null;
	const directions = Array.isArray(order.order)
		? order.order
		: String(order.order ?? 'ASC').split(',');
	const fields = Array.isArray(order.by) ? order.by : String(order.by).split(',');
	if (fields.length !== directions.length && directions.length !== 1) {
		throw queryError('The number of order fields and directions must match.');
	}
	return fields.map((field, index) => ({ field, direction: String(directions[index] ?? directions[0]).toUpperCase() }));
}

function queryError(message) {
	const error = new NodesterQueryError(message);
	error.status = 422;
	return error;
}

function _traverseIncludedOrders(resultQuery, rootModel) {
	for (let i = 0; i < resultQuery.include.length; i++) {
		const include = resultQuery.include[i];

		if (!include?.order) {
			continue;
		}

		// if (!resultQuery.order) {
		// 	resultQuery.order = [];
		// }

		const { association } = include;
		const {
			associatedModel,
			associationType
		} = getModelAssociationProps(rootModel.associations[association]);

		switch (associationType) {
			case 'HasMany': {
				include.separate = true;
				// resultQuery.order.push([
				// 	path,
				// 	...include.order[0]
				// ]);
				// delete resultQuery.include[i].order;
				break;
			}
			default:
				break;
		}

		_traverseIncludedOrders(resultQuery.include[i], associatedModel);
	}

	return resultQuery;
}

function _setValueWithBounds(value, type, bounds) {
	if (typeof bounds === 'object') {

		switch (type) {
			case 'number': {
				let _value = value;

				const {
					min,
					max
				} = bounds;

				const _min = isNaN(min) ? 1 : min;
				_value = _value < _min ? _min : _value;

				const _max = isNaN(max) ? 1 : max;
				_value = _value > _max ? _max : _value;

				return _value;
			}
			default:
				break;
		}
	}

	// If bounds were not set, just use original value.
	return value;
}
