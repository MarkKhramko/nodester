/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const { Op } = require('sequelize');
const NQueryError = require('../factories/errors/NodesterQueryError');
const httpCodes = require('nodester/http/codes');


module.exports = traverse;

function traverse(queryNode, filter=null, model) {

	const sequelize = model.sequelize;
	const fieldsAvailable = Object.keys(model.tableAttributes);
	const includesAvailable = model.getIncludesList();

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
			const RootModelName = model.options.name;
			// Count can be requested for this model,
			// or for any of the available uncludes.
			const isForRootModel = countTarget === RootModelName.plural.toLowerCase();

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
						model.associations[countTarget] === undefined
					) {
					const err = new NQueryError(`Count for '${ countTarget }' is not available.`);
					err.status = httpCodes.NOT_ACCEPTABLE;
					throw err;
				}

				const {
					foreignKey,
					sourceKey
				} = model.associations[countTarget];
				rawSQL += `${ countTarget } where ${ countTarget }.${ foreignKey }=${ RootModelName.singular }.${ sourceKey })`;
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
			case 'limit':
				// Do not set if -1:
				if (value === -1) 
					continue;

				newQuery.limit = value;
				continue;

			case 'skip':
				// Do not set if 0:
				if (value === 0)
					continue;

				newQuery.offset = value;
				continue;

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

	//	"statics" override or set any query Clause:
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
	// 	If requested includes are not available:
	const leftIncludes = includesAvailable.map(i => i.association);
	for (let include of includes) {
		const includeName = include.model;

		const includeIndex = leftIncludes.indexOf(includeName);
		if (includeIndex === -1) {
			const err = new TypeError(`No include named '${ includeName }'`);
			err.status = httpCodes.NOT_ACCEPTABLE;
			throw err;
		}

		leftIncludes.splice(includeIndex, 1);
	}

	_traverseIncludes(includes, model, filter, newQuery)
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


function _traverseIncludes(includes, model, filter=null, resultQuery) {
	// If no Filter:
	if (filter === null) {
		for (let include of includes) {
			const includeName = include.model;
			const association = model.associations[includeName];

			// If no such association:
			if (!association) {
				const err = new TypeError(`No include '${ includeName }'`);
				err.status = httpCodes.NOT_ACCEPTABLE;
				throw err;
			}

			const includeModel = association.target;
			// Build query for this include.
			const associationQuery = traverse(include, null, includeModel);

			_addAssociationQuery(associationQuery, includeName, resultQuery);
		}
	}
	//	Filter is present:
	else {
		const filterIncludeEntries = Object.entries(filter.includes);
		for (let [includeName, includeFilter] of filterIncludeEntries) {			
			const association = model.associations[includeName];
			// If no such association:
			if (!association) {
				const err = new TypeError(`No include ${ includeName }`);
				err.status = httpCodes.NOT_ACCEPTABLE;
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
