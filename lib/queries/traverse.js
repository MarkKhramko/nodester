const { Op } = require('sequelize');


module.exports = traverse;

function traverse(queryNode, colander=null, model) {

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
		clauses,
	} = _disassembleQueryNode(queryNode);


	// Fields:
	//
	//	If Colander is not set,
	//	use every available field:
	if (colander === null) {
		for (let field of fieldsAvailable) {
			// If no query filter or field is requested:
			if (fields.length === 0 || fields.indexOf(field) > -1) {
				newQuery.attributes.push(field);
				continue;
			}
		}
	}
	//	Colander is present:
	else {
		// If no query fields were set,
		//	use the ones from Colander,
		// If query fields were set,
		//	put them through Colander:
		for (let field of colander.fields) {
			if (fieldsAvailable.indexOf(field) === -1) {
				const err = new TypeError(`field ${ field } is not present in model.`);
				throw err;
			}

			// If field is not in available set:
			// if (colander.fields.indexOf(field) === -1) {
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
		throw err;
	}
	// Fields\


	// Clauses:
	const order = {};

	const clausesEntries = Object.entries(clauses);
	for (let [clauseName, value] of clausesEntries) {
		// If clause is not available:
		if (colander != null) {
			if (colander.clauses.indexOf(clauseName) === -1)
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
	if (colander !== null) {
		for (let [clauseName, staticClauseValue] of Object.entries(colander.statics.clauses)) {
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
	const sequelize = model.sequelize;
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
			const err = new TypeError(`No include named ${ includeName }`);
			throw err;
		}

		leftIncludes.splice(includeIndex, 1);
	}

	_traverseIncludes(includes, model, colander, newQuery)
	// Includes\


	// Where:
	const whereEntries = Object.entries(where);
	for (let [attribute, value] of whereEntries) {
		_parseWhereEntry(attribute, value, newQuery.where, colander.statics.attributes);
	}

	// If "where" was not set:
	if (whereEntries.length === 0) {
		delete newQuery.where;
	}
	// Where\


	return newQuery;
}


function _traverseIncludes(includes, model, colander, resultQuery) {
	// If no Colander:
	if (colander === null) {
		for (let include of includes) {
			const includeName = include.model;
			const association = model.associations[includeName];

			// If no such association:
			if (!association) {
				const err = new TypeError(`No include ${ includeName }`);
				throw err;
			}

			const includeModel = association.target;
			// Build query for this include.
			const associationQuery = traverse(include, null, includeModel);

			_addAssociationQuery(associationQuery, includeName, resultQuery);
		}
	}
	//	Colander is present:
	else {
		const colanderIncludeEntries = Object.entries(colander.includes);
		for (let [includeName, includeColander] of colanderIncludeEntries) {			
			const association = model.associations[includeName];
			// If no such association:
			if (!association) {
				const err = new TypeError(`No include ${ includeName }`);
				throw err;
			}

			// If include was not requested:
			const include = includes.find(({ model }) => model === includeName);
			if (!include)
				continue;

			const includeModel = association.target;
			// Build query for this include.
			const associationQuery = traverse(include, colander.includes[includeName], includeModel);

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
	const static = staticAttributes[attribute];

	// If attribute is Op (like, or, not, etc.):
	if (attribute in Op) {
		// Parse value:
		_value = _parseValue(_value, attribute);

		const op = Op[attribute];
		whereHolder[op] = _value;
		return;
	}
	
	// Static value overrides any other:
	if (!!static) {
		whereHolder[attribute] = static;
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
		...clauses
	} = queryNode;
	// delete queryNode.model;

	return {
		where: where ?? {},
		includes: includes ?? [],
		fields: fields ?? [],
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
