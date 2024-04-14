/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const ENCODES = require('./encodes');


module.exports = {
	decodeQueryString: _decodeQueryString
}

function _decodeQueryString(queryString='') {
	let decoded = '';

	// Token is a String, accumulated char-by-char.
	let token = '';

	let isEcodedChar = false;
	let encodedCharsCount = 0;

	for (let i=0; i < queryString.length; i++) {
		const char = queryString[i];

		if (char === '%') {
			isEcodedChar = true;
			decoded += token;
			token = '';
		}
	
		// Continue accumulating token.
		token += char;

		if (isEcodedChar) {
			encodedCharsCount++;

			if (encodedCharsCount === 3) {
				const decodedChar = ENCODES[token];
				
				if (!decodedChar) {
					const err = new Error(`Uknown token '${ token }' at index ${ i }.`);
					throw err;
				}

				decoded += decodedChar;
				// Reset:
				token = '';
				isEcodedChar = false;
				encodedCharsCount = 0;
			}
		}
	}

	// Last chunk.
	decoded += token;

	return decoded;
}
