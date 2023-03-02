// Sequelize.
const Sequelize = require('sequelize');
const { DataTypes } = require('sequelize');
const Op = require('sequelize').Op;

// Query formatter.
const NodesterQueryParams = require('../../../queries/NodesterQueryParams');

// Utils:
const { typeOf } = require('../../../utils/types.util');
const { isValidDate } = require('../../../validators/dates');
const { isValidNumber } = require('../../../validators/numbers');
const sntz = require('../../../utils/sanitizations.util');
const {
	hasTokens,
	splitIncludes,
	splitBy,
} = require('../../../lexers/query');


module.exports = parseSearchParams;


/**
 * Main parser function.
 *
 * @param {NodesterQueryParams} queryParams
 * @param {Object} opts
 *
 * @return {Object}
 *
 * @api public
 */
async function parseSearchParams(queryParams, opts={}) {
	try {
		const resultQuery = opts?.topLevelQuery ?? {};

		for (const [topLevelParam, topLevelValue] of queryParams.entries()) {

			$switch:
			switch(topLevelParam) {
				case 'fields':
				case 'f':
					resultQuery.fields = _parseFields(topLevelValue);
					break $switch;
				case 'includes':
				case 'in':
					resultQuery.include = await _parseIncludes(topLevelValue);
					break $switch;
				case 'limit':
				case 'l':
					resultQuery.limit = parseInt(topLevelValue);
					break $switch;
				case 'order':
				case 'o':
				case 'order_by':
				case 'o_by':
					_setOrder(
						resultQuery,
						queryParams.get('order') ?? queryParams.get('o'),
						queryParams.get('order_by') ?? queryParams.get('o_by')
					);
					break $switch;
				case 'skip':
				case 's':
					resultQuery.offset = parseInt(topLevelValue);
					break $switch;
				default:
					// Everything else will go to "where":
					_setWhereParam(resultQuery, topLevelParam, topLevelValue);
					break $switch;
			}
		}

		return Promise.resolve(resultQuery);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

function _parseFields(value) {
	return splitBy.comma(value);
}


async function _parseIncludes(includesValue) {
	if (typeOf(includesValue) !== 'string') {
		// Nothing.
		return Promise.resolve({});
	}
	const resultIncludesArray = [];

	// Split includes by comma.
	const includes = splitIncludes(includesValue);

	for (const include of includes) {
		const resultQuery = {}
		// Will break nested includes into array.
		const nested = splitBy.dot(include);

		for (const nestedInclude of nested) {
			const { has, queryParams, association } = _getSubQueryIfSet(nestedInclude);

			if (has) {
				resultQuery.association = association;
				await parseSearchParams(queryParams, { topLevelQuery: resultQuery });
			}
			else {
				if ('association' in resultQuery) {
					resultQuery.include = { 'association': nestedInclude };
				}
				else {
					resultQuery['association'] = nestedInclude;
				}
			}
		}

		resultIncludesArray.push(resultQuery);
	}

	return Promise.resolve(resultIncludesArray);
}


function _getSubQueryIfSet(includeValue='') {
	const result = { has: false };

	if (hasTokens(includeValue, '(', ')') === false) {
		return result;
	}

	result.has = true;

	// Get content between ():
	const indexAfterBracket = includeValue.indexOf('(') + 1;
	const substrLength = includeValue.length - 1;
	const subQuery = includeValue.slice(indexAfterBracket, substrLength);

	// TODO throw some error if format is invalid.
	result.queryParams = new NodesterQueryParams(subQuery);

	// Get association name:
	const association = includeValue.slice(0, indexAfterBracket-1);
	result.association = association;

	return result;
}


function _setOrder(query, order, orderBy='id') {
	if ('order' in query ) {
		return;
	}

	query.order = [
		orderBy ?? 'id',
		order?.toUpperCase() ?? 'DESC'
	];
}


function _setWhereParam(query, param, value) {

	// Ensure we have an object to assign a value to:
	if (!query.where) {
		query.where = {};
	}

	const parsedValue = _parseQueryValue(value);

	// If greater than:
	if (param.slice(-1) === '>') {
		const clearParam = param.slice(0, -1);
		query.where[clearParam] = { [Op.gt]: parsedValue };
	}
	// If lower than:
	else if (param.slice(-1) === '<') {
		const clearParam = param.slice(0, -1);
		query.where[clearParam] = { [Op.lt]: parsedValue };
	}
	// Nothing special:
	else {
		query.where[param] = parsedValue;
	}
}


/*
 * Local Utils:
 */
function _parseQueryValue(value='') {
	// If value matches "and()":
	if (value.slice(0, 4) === 'and(') {
		// Remove "and()".
		const clearValuesString = value.substr(4, value.length - 'and()'.length);

		const clearValues = clearValuesString.split(',');

		return {
			[Op.and]: clearValues.map(cv => _parseQueryValue(cv))
		}
	}
	// If value matches "like(value)":
	else if (value.slice(0, 5) === 'like(') {
		// Remove "like()".
		const clearValue = value.substr(5, value.length - 'like()'.length);

		return {
			[Op.like]: `%${ _parseQueryValue(clearValue) }%`
		}
	}
	// If value matches "notLike(value)":
	else if (value.slice(0, 8) === 'notLike(') {
		// Remove "notLike()".
		const clearValue = value.substr(8, value.length - 'notLike()'.length);

		return {
			[Op.notLike]: `%${ _parseQueryValue(clearValue) }%`
		}
	}
	// If value matches "not(value)":
	else if (value.slice(0, 4) === 'not(') {
		// Remove "not()".
		const clearValue = value.substr(4, value.length - 'not()'.length);

		return {
			[Op.not]: _parseQueryValue(clearValue)
		};
	}
	// If value matches "!(value)":
	else if (value.slice(0, 2) === '!(') {
		// Remove "!()".
		const clearValue = value.substr(4, value.length - '!()'.length);

		return {
			[Op.not]: _parseQueryValue(clearValue)
		};
	}
	// If value matches "or()":
	else if (value.slice(0, 3) === 'or(') {
		// Remove "or()".
		const clearValuesString = value.substr(3, value.length - 'or()'.length);

		const clearValues = clearValuesString.split(',');

		return {
			[Op.or]: clearValues.map(cv => _parseQueryValue(cv))
		}
	}
	else if (isValidDate(value)) {
		return new Date(value);
	}
	else if (isValidNumber(value)) {
		return +value;
	}
	else if (hasTokens(value, '.')) {
		return `$${ value }$`;
	}

	// For default, just set this value.
	return value;
}




function _sanitizeValue(
	value,
	dataType,
	fallback=null,
) {
	let result = null;

	if (dataType instanceof DataTypes.INTEGER) {
		result = sntz.INT(value, { fallback });
	}
	else if (dataType instanceof DataTypes.DECIMAL) {
		result = sntz.NUMBER(value, { fallback });
	}
	else if (dataType instanceof DataTypes.FLOAT) {
		result = sntz.NUMBER(value, { fallback });
	}
	else if (dataType instanceof DataTypes.STRING) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.TEXT) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.ENUM) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.JSON) {
		result = sntz.JSON(value, { fallback });
	}
	else if (dataType instanceof DataTypes.BOOLEAN) {
		result = sntz.BOOLEAN(value, { fallback });
	}
	else if (dataType instanceof DataTypes.DATE || dataType instanceof DataTypes.DATEONLY) {
		result = sntz.DATE(value, { fallback });
	}

	return result;
}
