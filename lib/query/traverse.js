/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const BOUNDS = require('../constants/Bounds');

const { Op } = require('sequelize');
const NQueryError = require('../factories/errors/NodesterQueryError');
const httpCodes = require('nodester/http/codes');

const { ensure } = require('../validators/arguments');


module.exports = traverse;

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
	const fieldsAvailable = Object.keys(_model.tableAttributes);

	const newQuery = {
		attributes: [],
		where: {},
		include: []
	};
	
	const {
		where,
		includes,
		fields,
		functions,
		clauses,
	} = _disassembleQueryNode(queryNode);


	// Fields:
	//
	//	If Filter is not set,
	//	use every available field:
	if (filter === null) {
		for (let field of fieldsAvailable) {
			// If no query filter or field is requested:
			if (fields.length === 0 || fields.indexOf(field) > -1) {
				newQuery.attributes.push(field);
				continue;
			}
		}
	}
	//	Filter is present:
	else {
		// If no query fields were set,
		//	use the ones from Filter,
		// If query fields were set,
		//	put them through Filter:
		for (let field of filter.fields) {
			if (fieldsAvailable.indexOf(field) === -1) {
				const err = new TypeError(`Field '${ field }' is not present in model.`);
				err.status = httpCodes.NOT_ACCEPTABLE;
				throw err;
			}

			// If field is not in available set:
			// if (filter.fields.indexOf(field) === -1) {
			// 	continue;
			// }

			// If no query filter or field is requested:
			if (fields.length === 0 || fields.indexOf(field) > -1) {
				newQuery.attributes.push(field);
				continue;
			}
		}
	}
	
	//	At least 1 field is mandatory:
	if (newQuery.attributes.length === 0) {
		const err = new TypeError(`No fields were selected.`);
		err.status = httpCodes.NOT_ACCEPTABLE;
		throw err;
	}
	// Fields\

	// Functions:
	for (const fnParams of functions) {

		// If COUNT() is requested:
		if (fnParams.fn === 'count') {
			const countParams = fnParams.args;

			const [ countTarget ] = countParams;
			// Count can be requested for this model,
			// or for any of the available uncludes.
			const isForRootModel = countTarget === rootModelName.plural.toLowerCase();

			// Compile request:
			//	Example:
			// `(SELECT COUNT(*) FROM comments WHERE comments.morph_id=Morph.id)`

			// Params for attribute:
			let rawSQL = '(SELECT COUNT(*) FROM ';
			let countAttribute = '_count';

			// If request to count one of includes:
			if (!isForRootModel) {
				// Check if it's available:
				if (
						!filter
						||
						!filter?.includes[countTarget]
						||
						rootModelAssociations[countTarget] === undefined
					) {
					const err = new NQueryError(`Count for '${ countTarget }' is not available.`);
					err.status = httpCodes.NOT_ACCEPTABLE;
					throw err;
				}

				const {
					foreignKey,
					sourceKey
				} = rootModelAssociations[countTarget];
				rawSQL += `${ countTarget } where ${ countTarget }.${ foreignKey }=${ rootModelName.singular }.${ sourceKey })`;
				countAttribute = `${ countTarget }_count`;
			}

			newQuery.attributes.push(
				[sequelize.literal(rawSQL), countAttribute]
			);
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
				order.order = value;
				continue;

			case 'order_by':
				order.by = value;
				continue;
				
			default:
				continue;
		}
	}

	//	"statics" override or set any query in clauses:
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
	if ( ['rand', 'random'].indexOf(order.order) > -1) {
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
				newQuery.order = [ ['id', 'desc'] ];
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
			const err = new NQueryError(`No include named '${ includeName }'`);
			err.status = httpCodes.NOT_ACCEPTABLE;
			Error.captureStackTrace(err, traverse);
			throw err;
		}
	}

	_traverseIncludes(includes, _model, filter, newQuery)
	// Includes\


	// Where:
	const whereEntries = Object.entries(where);
	for (let [attribute, value] of whereEntries) {
		_parseWhereEntry(attribute, value, newQuery.where, filter.statics.attributes);
	}

	// If "where" was not set:
	if (whereEntries.length === 0) {
		delete newQuery.where;
	}
	// Where\

	return newQuery;
}


function _traverseIncludes(includes, model, filter, resultQuery) {
	const filterIncludesEntries = Object.entries(filter.includes);
	for (let [ includeName, includeFilter ] of filterIncludesEntries) {

		const association = model.associations[includeName];

		// If no such association:
		if (!association) {
			const err = new NQueryError(`No include named '${ includeName }'`);
			err.status = httpCodes.NOT_ACCEPTABLE;
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

		_addAssociationQuery(associationQuery, includeName, resultQuery);
	}
}


function _addAssociationQuery(associationQuery, includeName, resultQuery) {

	// Add all association info into query.
	resultQuery.include.push({
		association: includeName,
		...associationQuery
	});
}


function _parseWhereEntry(attribute, value, whereHolder, staticAttributes) {
	let _value = value;
	const staticAttribute = staticAttributes[attribute];

	// If attribute is Op (not, like, or, etc.):
	if (attribute in Op) {
		// Parse value:
		_value = _parseValue(_value, attribute);

		const op = Op[attribute];
		whereHolder[op] = _value;
		return;
	}
	
	// Static value overrides any other:
	if (!!staticAttribute) {
		whereHolder[attribute] = staticAttribute;
		return;
	}

	whereHolder[attribute] = _parseValue(_value, attribute);
}

function _disassembleQueryNode(queryNode) {
	// Disassemble current query node:
	const {
		where,
		includes,
		fields,
		functions,
		...clauses
	} = queryNode;
	// delete queryNode.model;

	return {
		where: where ?? {},
		includes: includes ?? [],
		fields: fields ?? [],
		functions: functions ?? [],
		clauses: clauses ?? []
	};
}

function _parseValue(value, attribute) {
	// If value is Object:
	if (typeof value === 'object' && Array.isArray(value) === false) {
		const [opKey, rawValue] = (Object.entries(value))[0];

		// If operation is "in":
		if (opKey === 'in') {
			// Unwrap rawValue.
			return rawValue[0][attribute];
		}
		else {
			const op = Op[opKey];
			return { [op]: rawValue };
		}
	}

	return value;
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
