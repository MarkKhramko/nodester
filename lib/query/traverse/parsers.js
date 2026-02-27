/**
 * nodester
 * MIT Licensed
 */

'use strict';

const { Op } = require('sequelize');
const { DataTypes } = require('sequelize');


module.exports = {
	parseValue: _parseValue,
	parseWhereEntry: _parseWhereEntry,
}

function _parseValue(value, attribute, model) {
	// If value is Object:
	if (typeof value === 'object' && Array.isArray(value) === false) {
		// Combine all OPs into one query:
		const allOPs = {};
		const entries = Object.entries(value);
		for (const [opKey, rawValue] of entries) {
			const op = Op[opKey];

			let _value = rawValue;

			// Sequilize does not allow Op comparisons of dates
			// without converting the value to the Date object:
			switch (model.tableAttributes[attribute].type.key) {
				case DataTypes.DATE.key:
				case DataTypes.DATEONLY.key:
					const parse = (val) => {
						if (!val) return null;
						let d = new Date(val);
						if (isNaN(d.valueOf()) && typeof val === 'string') {
							// Try to fix common space/plus-instead-of-T issue:
							d = new Date(val.trim().replace(/[ +]/g, 'T'));
						}
						if (isNaN(d.valueOf())) {
							const err = new Error(`nodester: Invalid date value '${val}' for attribute '${attribute}'`);
							throw err;
						}
						return d;
					};

					if (Array.isArray(rawValue)) {
						if (opKey === 'in' || opKey === 'notIn' || opKey === 'between' || opKey === 'notBetween') {
							_value = rawValue.map(v => parse(v));
						} else {
							_value = parse(rawValue[0]);
						}
					} else {
						_value = parse(rawValue);
					}
					break;

				default:
					break;
			}

			allOPs[op] = _value;
		}
		return allOPs;
	}

	return value;
}

function _parseWhereEntry(attribute, value, whereHolder, model) {
	let _value = value;

	// If attribute is Op (not, like, or, etc.):
	if (attribute in Op) {
		// Parse value:
		_value = _parseValue(_value, attribute, model);

		const op = Op[attribute];
		whereHolder[op] = _value;
		return;
	}

	whereHolder[attribute] = _parseValue(_value, attribute, model);
}

