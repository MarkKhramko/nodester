/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const BOUNDS = require('../../constants/Bounds');

const { NodesterQueryError } = require('nodester/errors');
const httpCodes = require('nodester/http/codes');

const { ensure } = require('nodester/validators/arguments');

const {
	parseValue,
	parseWhereEntry,
} = require('./parsers');

const {
	disassembleQueryNode,
	addAssociationQuery,
} = require('./utils');

const {
	getModelAssociationProps
} = require('../../utils/modelAssociations.util');


module.exports = traverse;

/**
 *
 * @param {ModelsTreeNode} queryNode
 * @param {NodesterFilter} filter
 * @param {Model} model
 *
 * @access public
 */
function traverse(queryNode, filter=null, model=null) {
	const _model = model ?? filter.model;

	try {
		ensure(queryNode, 'object,required', 'queryNode');
		ensure(filter, 'object,required', 'filter');
		if (!_model) {
			const err = new TypeError(`'model' must be provided either in 'filter.model' or as a third argument.`);
			throw err;
		}
	}
	catch(error) {
		Error.captureStackTrace(error, traverse);
		throw error;
	}

	const rootModelName = _model.options.name;
	const rootModelAssociations = _model.associations;
	const { sequelize } = _model;
	const attributesAvailable = Object.keys(_model.tableAttributes);

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
	} = disassembleQueryNode(queryNode);


	// Attribute:
	//
	//	If Filter is not set,
	//	use every available attribute:
	if (filter === null) {
		for (let attribute of attributesAvailable) {
			// If no query filter or attribute is requested:
			if (attributes.length === 0 || attributes.indexOf(attribute) > -1) {
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
				const err = new NodesterQueryError(`Field '${ attribute }' is not present in model.`);
				Error.captureStackTrace(err, traverse);
				throw err;
			}

			// If attribute is not in available set:
			// if (filter.attributes.indexOf(attribute) === -1) {
			// 	continue;
			// }

			// If no query filter or attribute is requested:
			if (attributes.length === 0 || attributes.indexOf(attribute) > -1) {
				newQuery.attributes.push(attribute);
				continue;
			}
		}
	}
	
	//	At least 1 attribute is mandatory:
	if (newQuery.attributes.length === 0) {
		const err = new NodesterQueryError(`No attributes were selected.`);
		Error.captureStackTrace(err, traverse);
		throw err;
	}
	// Attribute\

	// Functions:
	for (const fnParams of functions) {

		switch(fnParams.fn) {
			// SQL COUNT():
			case 'count': {
				const countParams = fnParams.args;

				const [ countTarget ] = countParams;
				// Count can be requested for this model,
				// or for any of the available uncludes.
				const isForRootModel = countTarget === rootModelName.plural.toLowerCase();

				// Compile request:
				//	Example of desired SQL:
				//	`(SELECT COUNT(*) FROM comments WHERE comments.post_id=Post.id)`
				//
				let rawSQL = '(SELECT COUNT(*) FROM ';
				let countAttribute = 'count';

				// If request to count one of the includes:
				if (!isForRootModel) {
					// Check if it's available:
					if (
						!filter
						||
						!filter?.includes[countTarget]
						||
						rootModelAssociations[countTarget] === undefined
					) {
						const err = new NodesterQueryError(`Count for '${ countTarget }' is not available.`);
						Error.captureStackTrace(err, traverse);
						throw err;
					}

					const {
						as,
						target,
						foreignKey,
						sourceKey
					} = rootModelAssociations[countTarget];
					const { tableName } = target;

					rawSQL += `${ tableName } where ${ tableName }.${ foreignKey }=${ rootModelName.singular }.${ sourceKey })`;
					countAttribute = `${ as }_count`;
				}

				newQuery.attributes.push(
					[sequelize.literal(rawSQL), countAttribute]
				);
			}
			// Unknow function:
			default:
				break;
		}
	}
	// Functions\

	// Clauses:
	const order = {};

	const clausesEntries = Object.entries(clauses);
	for (let [clauseName, value] of clausesEntries) {

		// If clause is not available:
		if (filter != null) {
			if (filter.clauses.indexOf(clauseName) === -1)
				continue;
		}

		switch(clauseName) {
			case 'limit': {
				const _value = _setValueWithBounds(value, 'number', filter.bounds.clauses.limit);
				
				// Do not set if -1:
				if (_value === -1) 
					continue;

				newQuery.limit = _value;
				continue;
			}
			case 'skip': {
				const _value = _setValueWithBounds(value, 'number', filter.bounds.clauses.skip);

				// Do not set if 0:
				if (_value === 0)
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
				continue;
		}
	}

	//	Override clauses with "statics":
	if (filter !== null) {
		const staticClausesEntries = Object.entries(filter.statics.clauses);

		for (let entry of staticClausesEntries) {
			const [clauseName, staticClauseValue] = entry;

			switch(clauseName) {
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
	if (newQuery.limit === undefined && typeof filter.bounds.clauses.limit === 'object') {
		newQuery.limit = filter.bounds.clauses.limit.max ?? BOUNDS.limit.max;
	}
	// Clauses\


	// Order:
	if (
		order.order === 'rand'
		||
		order.order === 'random'
	) {
		newQuery.order = sequelize.random();
	}
	else {
		const column = sequelize.col( order.by );
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
				newQuery.order = [ sequelize.fn('max', column), 'DESC' ];
				break;
			// MAX/MIN\

			case null:
			case undefined:
				// newQuery.order = [ ['id', 'desc'] ];
				break;

			default:
				newQuery.order = [ [order.by, order.order] ];
				break;
		}
	}
	// Order\


	// Includes:
	// 	Validate, if requested includes are available:
	for (let include of includes) {
		const includeName = include.model;

		if (rootModelAssociations[includeName] === undefined) {
			const err = new NodesterQueryError(`No include named '${ includeName }'`);			
			Error.captureStackTrace(err, traverse);
			throw err;
		}
	}

	_traverseIncludes(includes, _model, filter, newQuery)
	// Includes\


	// Where:

	//	Set aatributes from Query:
	const whereEntries = Object.entries(where);
	for (let [ attribute, value ] of whereEntries) {
		parseWhereEntry(attribute, value, newQuery.where);
	}

	//	Static attributes override previously set attributes:
	const staticAttributesEntries = Object.entries(filter.statics.attributes);
	for (let [ attribute, staticValue ] of staticAttributesEntries) {
		newQuery.where[attribute] = parseValue(staticValue, attribute);
	}

	//	If "where" was not set in any way,
	// 	remove it from the db query:
	if (Object.entries(newQuery.where).length === 0) {
		delete newQuery.where;
	}
	// Where\

	// Combine included orders into one at the top level:
	// - Why?
	// - Sequelize ingores included orders for association types like:
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
function _traverseIncludes(includes, rootModel, filter, resultQuery) {
	const filterIncludesEntries = Object.entries(filter.includes);
	for (let [ includeName, includeFilter ] of filterIncludesEntries) {

		const association = rootModel.associations[includeName];

		// If no such association:
		if (!association) {
			const err = new NodesterQueryError(`No include named '${ includeName }'`);			
			Error.captureStackTrace(err, _traverseIncludes);
			throw err;
		}

		// If include was not requested:
		const include = includes.find(({ model }) => model === includeName);
		if (!include)
			continue;

		const includeModel = association.target;
		// Build query for this include.
		const associationQuery = traverse(include, filter.includes[includeName], includeModel);

		addAssociationQuery(associationQuery, includeName, resultQuery);
	}
}

function _traverseIncludedOrders(resultQuery, rootModel) {
	for (let i=0; i < resultQuery.include.length; i++) {
		const include = resultQuery.include[i];

		if (!include?.order) {
			continue;
		}

		if (!resultQuery.order) {
			resultQuery.order = [];
		}

		const { association } = include;
		const {
			associatedModel,
			associationType
		} = getModelAssociationProps(rootModel.associations[association]);

		switch(associationType) {
			case 'HasMany': {
				resultQuery.order.push([
					{ association },
					...include.order[0]
				]);
				delete resultQuery.include[i].order;
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

		switch(type) {
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
