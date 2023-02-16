// Constants.
const SubIncludesQueryRegex = /\([^)]*\)/g;

// Sequelize.
const Op = require('sequelize').Op;

// Utils.
const {
	splitByDot,
	splitByAmpersand
} = require('nodester/utils/strings.util');


module.exports = {
	parseQueryParams: _parseQueryParams,
	deleteQuerySortParams: _deleteQuerySortParams,

	// SubIncludes Query:
	hasSubIncludesQuery: _hasSubIncludesQuery,
	cutSubIncludesQuery: _cutSubIncludesQuery,
	parseSubIncludesQuery: _parseSubIncludesQuery
}

function _parseQueryParams(
	requestQueryObject={},
	sequilizeQuery=null
) {
	const skip = parseInt(requestQueryObject?.skip ?? 0);
	const limit = parseInt(requestQueryObject?.limit ?? 50);

	sequilizeQuery.offset = skip;
	sequilizeQuery.limit = limit;

	const order = requestQueryObject?.order;

	// If order is set:
	if (!!order) {
		const orderBy = requestQueryObject?.order_by ?? 'id';

		sequilizeQuery.order = [
			[ orderBy, order ]
		];
	}

	// Clear sort params.
	_deleteQuerySortParams(requestQueryObject);

	// Get include names.
	const _includes = sequilizeQuery?.include?.map( include => include.association ) ?? [];

	// Count query keys.
	const keysCount = Object.keys(requestQueryObject).length;

	// If query has no keys,
	// stop further execution:
	if (keysCount === 0) {
		return;
	}

	// This container is a reference to current "where".
	let container = null;
	let isContainerArray = false;

	// If query has only 1 key:
	if (keysCount === 1) {
		// Define empty query's where.
		sequilizeQuery.where = {};
		container = sequilizeQuery.where;
	}
	else {
		// Define conjuction of params in query's where.
		sequilizeQuery.where = {
			[Op.and]: []
		};
		container = sequilizeQuery.where[Op.and];
		isContainerArray = true;
	}

	// Go through query's keys:
	Object.keys(requestQueryObject)
				.forEach((queryKey) => {

		// Parse value of this key:
		const value = requestQueryObject[queryKey];
		// If value is not a number, parse it further.
		const parsedValue = isNaN( value ) ? _parseHTTPQueryValue( `${ requestQueryObject[queryKey] }` ) : value;
		
		// If we got nested key:
		if (queryKey.indexOf('.') !== -1) {

			// If this key is included as association:
			const associationIndex = _includes.indexOf(queryKey.split('.')[0]);
			if (associationIndex > -1) {
				sequilizeQuery.include[associationIndex].where = { [`$${queryKey}$`]: parsedValue };
			}
			// Use special sequelize syntax for nested SELECT:
			else if (isContainerArray) {
				const selectObject = { [`$${queryKey}$`]: parsedValue };
				container.push(selectObject);
			}
			else {
				container[`$${queryKey}$`] = parsedValue;
			}
		}
		// On regular key, set regular key-value pair:
		else {
			if (isContainerArray) {
				const selectObject = { [queryKey]: parsedValue };
				container.push(selectObject);
			}
			else {
				container[queryKey] = parsedValue;
			}
		}
	});
}

function _parseHTTPQueryValue(
	value='',
	isNumber=false
) {
	// If value matches "and()":
	if (value.slice(0, 4) === 'and(') {
		// Remove "and()".
		const clearValuesString = value.substr(4, value.length - 'and()'.length);

		const clearValues = clearValuesString.split(',');

		return {
			[Op.and]: clearValues.map(cv => _parseHTTPQueryValue(cv))
		}
	}
	// If value matches "like(value)":
	else if (value.slice(0, 5) === 'like(') {
		// Remove "like()".
		const clearValue = value.substr(5, value.length - 'like()'.length);

		return {
			[Op.like]: `%${ _parseHTTPQueryValue(clearValue) }%`
		}
	}
	// If value matches "notLike(value)":
	else if (value.slice(0, 8) === 'notLike(') {
		// Remove "notLike()".
		const clearValue = value.substr(8, value.length - 'notLike()'.length);

		return {
			[Op.notLike]: `%${ _parseHTTPQueryValue(clearValue) }%`
		}
	}
	// If value matches "not(value)":
	else if (value.slice(0, 4) === 'not(') {
		// Remove "not()".
		const clearValue = value.substr(4, value.length - 'not()'.length);

		return {
			[Op.not]: _parseHTTPQueryValue(clearValue)
		};
	}
	// If value matches "or()":
	else if (value.slice(0, 3) === 'or(') {
		// Remove "or()".
		const clearValuesString = value.substr(3, value.length - 'or()'.length);

		const clearValues = clearValuesString.split(',');

		return {
			[Op.or]: clearValues.map(cv => _parseHTTPQueryValue(cv))
		}
	}
	// If value is a number:
	// else if (!isNaN(value)) {
	// 	const number = parseFloat(value);
	// 	return number;
	// }
	// For default, just set this value in "where"
	return value;
}

function _deleteQuerySortParams(requestQueryObject={}) {
	delete requestQueryObject.skip;
	delete requestQueryObject.limit;
	delete requestQueryObject.order;
	delete requestQueryObject.order_by;
}

// If string has nested query "()":
function _hasSubIncludesQuery(string='') {
	return SubIncludesQueryRegex.test(string);
}

function _cutSubIncludesQuery(string='') {
	const query = string.match(SubIncludesQueryRegex)[0];
	const newString = string.replace(SubIncludesQueryRegex, '');

	return [ query, newString ];
}

function _parseSubIncludesQuery(
	associationName,
	subIncludesQuery='',
	sequilizeQuery=null
) {
	const query = {};

	// Magic trick to make everything work (DO NOT REMOVE).
	sequilizeQuery.separate = true;

	// If first "("" & ")" are set, cut them:
	const subIncludesQueryRegex = /\([^)]*\)/g;
	const clearQuery = subIncludesQueryRegex.test(subIncludesQuery) ?
												subIncludesQuery.substr(1, subIncludesQuery.length - 2)
												:
												subIncludesQuery;

	const keyValues = splitByAmpersand(clearQuery).map(kv => {
											const keyValue = kv.split('=');
											query[keyValue[0]] = keyValue[1];
										});


	if (!!query.skip) {
		const skip = parseInt(query.skip ?? 0);
		sequilizeQuery[`$${ associationName }.offset$`] = skip;
	}

	if (!!query.limit) {
		const limit = parseInt(query.limit ?? 50);
		sequilizeQuery[`$${ associationName }.limit$`] = limit;
	}

	// If order is set:
	if (!!query.order) {
		const orderBy = query?.order_by ?? 'id';

		sequilizeQuery.order = [
			[ orderBy, query.order ]
		];
	}
}
