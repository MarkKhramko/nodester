/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const {
	BOOLEAN
} = require('nodester/utils/sanitizations');


module.exports = Params;

/**
 * Extracts only values set in the second argument from the first argument.
 * If such values is missing in the first argument, will fallback to the value in the second argument.
 *
 * @param {Object} sourceObj
 * @param {Object} defaultValuesList
 *
 * @return {Object} result
 *
 * @api public
 */
function Params(
	sourceObj={},
	defaultValuesList={}
) {
	const result = {};

	const keys = Object.keys(defaultValuesList);
	for (const key of keys) {

		// If value is not set,
		// use default one from 'defaultValuesList':
		if (sourceObj[key] === undefined) {
			result[key] = defaultValuesList[key];
			continue;
		}

		// If String:
		if (typeof defaultValuesList[key] === 'string') {
			result[key] = `${ sourceObj[key] }`;
			continue;
		}

		const isBoolean = toString.call(defaultValuesList[key]) === '[object Boolean]';
		const isNumber = !isNaN(`${ defaultValuesList[key] }`);

		result[key] = isBoolean ? BOOLEAN(sourceObj[key]) : (isNumber ? parseFloat(sourceObj[key]) : sourceObj[key]);
	}

	return result;
}
