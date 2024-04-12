/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const { Op } = require('sequelize');


module.exports = {
	parseValue: _parseValue,
	parseWhereEntry: _parseWhereEntry,
}

function _parseValue(value, attribute) {
	// If value is Object:
	if (typeof value === 'object' && Array.isArray(value) === false) {
		const [ opKey, rawValue ] = (Object.entries(value))[0];

		const op = Op[opKey];
		return { [op]: rawValue };
	}

	return value;
}

function _parseWhereEntry(attribute, value, whereHolder) {
	let _value = value;

	// If attribute is Op (not, like, or, etc.):
	if (attribute in Op) {
		// Parse value:
		_value = _parseValue(_value, attribute);

		const op = Op[attribute];
		whereHolder[op] = _value;
		return;
	}

	whereHolder[attribute] = _parseValue(_value, attribute);
}

