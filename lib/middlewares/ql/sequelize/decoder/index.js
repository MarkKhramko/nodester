/**
 * nodester
 * MIT Licensed
 */

'use strict';

const ENCODES = require('./encodes');


module.exports = {
	decodeQueryString: _decodeQueryString
}

function _decodeQueryString(queryString = '') {
	let decoded = '';
	let i = 0;

	while (i < queryString.length) {
		const char = queryString[i];

		if (char === '%') {
			// Collect all consecutive %XX tokens for multi-byte UTF-8 sequences
			const percentTokens = [];
			let j = i;

			// Collect consecutive %XX patterns:
			while (j < queryString.length && queryString[j] === '%' && j + 2 < queryString.length) {
				const token = queryString.substring(j, j + 3);
				percentTokens.push(token);
				j += 3;
			}

			// Try single-byte dictionary lookup first (optimization for ASCII):
			if (percentTokens.length === 1) {
				const decodedChar = ENCODES[percentTokens[0]];
				if (decodedChar) {
					decoded += decodedChar;
					i = j;
					continue;
				}
			}

			// Multi-byte sequence or unknown single byte - decode as UTF-8:
			try {
				const hexBytes = percentTokens.map(token => {
					// Remove '%'.
					const hex = token.substring(1);
					return parseInt(hex, 16);
				});

				const buffer = Buffer.from(hexBytes);
				const decodedString = buffer.toString('utf8');
				decoded += decodedString;
				i = j;
			}
			catch (error) {
				const err = new Error(`Failed to decode UTF-8 sequence at index ${i}: ${percentTokens.join('')}`);
				err.originalError = error;
				throw err;
			}
		}
		else {
			// Regular character, just append.
			decoded += char;
			i++;
		}
	}

	return decoded;
}
