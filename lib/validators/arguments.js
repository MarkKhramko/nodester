/**
 * nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	ensure: _ensure
}

/**
 * Validates passed argument against passed rules.
 *
 * @example
 *   ensure(value, 'string|array|object,required', 'value');
 *
 * @param {any} argument
 * @param {string} rules
 * @param {string} [argumentName]
 *
 * @alias ensure
 * @access public
 */
function _ensure(argument, rules, argumentName) {
	if (typeof rules !== 'string') {
		const err = new TypeError(`'rules' is a required argument.`);
		Error.captureStackTrace(err, _ensure);
		throw err;
	}

	const name = argumentName ? `'${ argumentName }'` : 'Argument';
	
	let rulesArray = rules.split(',');

	let types = [];
	let isRequired = undefined;

	for (const rule of rulesArray) {
		// Types:
		if (rule.indexOf('|') > 0) {
			types = [
				...types,
				...rule.split('|')
			];
			continue;
		}

		if (rule === 'required') {
			if (argument === undefined || argument === null) {
				const err = new TypeError(`${ name } is required.`);
				Error.captureStackTrace(err, _ensure);
				throw err;
			}

			isRequired = true;
			continue;
		}

		types.push(rule);
	}

	if (types.length === 0)
		return true;

	let mismatchedTypesCount = 0;
	for (const type of types) {
		if (type === 'array') {
			if (Array.isArray(argument) === false) {
				mismatchedTypesCount++;
				continue;
			}
			else {
				return true;
			}
		}
		else if (typeof argument !== type) {
			mismatchedTypesCount++;
			continue;
		}
	}

	if (mismatchedTypesCount === types.length && argument !== undefined) {
		const err = new TypeError(`${ name } must be of type: ${ types.join(' or ') }.`);
		Error.captureStackTrace(err, _ensure);
		throw err;
	}

	return true;
}
