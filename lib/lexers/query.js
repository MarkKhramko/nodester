const {
	splitByComma,
	splitByDot,
} = require('../utils/strings.util');


module.exports = {
	hasTokens: _hasTokens,
	splitIncludes: _splitIncludes,

	splitBy: {
		comma: splitByComma,
		dot: splitByDot,
	}
}


/**
 * Check if string has any of tokens.
 *
 * @param {String} string
 * @param {Array|String} tokens
 *
 * @return {Boolean|Undefined}
 *
 * @api public
 * @alias hasTokens
 */
function _hasTokens(string, tokens) {
	if (Array.isArray(tokens)) {
		for (const token of tokens) {
			const has = string.includes(token);

			if (has === false) {
				return false;
			}
		}

		return true;
	}

	if (typeof tokens === 'string') {
		return string.includes(tokens);
	}

	return undefined;
}


/**
 * Split "includes" param string into an array.
 *
 * @param {String} includes
 *
 * @return {Array}
 *
 * @api public
 * @alias splitIncludes
 */
function _splitIncludes(includes='') {
	let deep = 0;
	let token = '';
	let arr = [];

	let i = 0;
	for (const char of includes) {
		if (char === '(') {
			deep++;
		}

		if (char === ')') {
			deep--;
		}

		if (char === ',') {
			if (deep === 0) {
				arr.push(token);
				token = '';
				continue;
			}
		}

		token += char;
		i++;

		// If last char:
		if (i === includes.length-1) {
			arr.push(token);
		}
	}

	return arr;
}
