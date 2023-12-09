/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Utils:
const contentType = require('content-type');


module.exports = {
	setCharset: _setCharset
}

/**
 * Set the charset in a given Content-Type string.
 *
 * @param {string} type
 * @param {string} charset
 *
 * @return {string}
 *
 * @access private
 */
function _setCharset(type, charset) {
	if (!type || !charset) {
		return type;
	}

	// parse type
	const parsed = contentType.parse(type);

	// set charset
	parsed.parameters.charset = charset;

	// format type
	return contentType.format(parsed);
}
