const { Op } = require('sequelize');


module.exports = traverse;

function traverse(queryNode, colander, model) {
	const fieldsAvailable = Object.keys(model.tableAttributes);
	const includesAvailable = model.getIncludesList();

	const newQuery = {
		attributes: [],
		where: {},
		includes: []
	};
	
	// Disassemble current query node:
	const {
		where,
		includes,
		fields,
		...clauses
	} = queryNode;
	delete queryNode.model;


	// Fields:
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
		if (colander.clauses.indexOf(clauseName) === -1) {
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
	// Clauses\


	// Order:
	newQuery.order = [ [order.by, order.order] ];
	// Order\


	// includes:
	const includeEntries = Object.entries(includes);
	for (let [includeName, includeColander] of includeEntries) {
		// If include is not available:
		// if (includesAvailable)
		// traverse(include, colander, model);
	}
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
