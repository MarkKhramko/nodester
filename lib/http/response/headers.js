/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Constants.
const CHARSET_REGEX = /;\s*charset\s*=/;

// Utils:
const mime = require('mime');


module.exports = {
	setHeader: _setHeader,
	appendHeader: _appendHeader,
	getHeader: _getHeader,
	removeHeader: _removeHeader,
}

/**
 * Set header `field` to `value`, or pass
 * an object of header fields.
 *
 * @example
 *    res.set('Foo', ['bar', 'baz']);
 *    res.set('Accept', 'application/json');
 *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
 *
 *
 * @param {string|Object} keyOrObject
 * @param {string|Array} value
 *
 * @return {ServerResponse} for chaining
 *
 * @alias setHeader
 * @access public
 */
function _setHeader(keyOrObject, value) {
	// As a pair:
	if (arguments.length === 2) {
		let _value = Array.isArray(value) ? value.map(String) : String(value);

		// Add charset to content-type:
		if (keyOrObject.toLowerCase() === 'content-type') {
			
			if (Array.isArray(_value)) {
				throw new TypeError('Content-Type cannot be set to an Array');
			}

			if (!CHARSET_REGEX.test(_value)) {
				const charset = mime.charsets.getType(_value.split(';')[0]);
				
				if (charset) {
					_value += '; charset=' + charset.toLowerCase();
				}
			}
		}

		this.setHeader(keyOrObject, _value);
	}
	// As an object
	else if (typeof keyOrObject === 'object') {
		for (let key in keyOrObject) {
			this.setHeader(key, keyOrObject[key]);
		}
	}
	else {
		const err = new TypeError(`'keyOrObject' must be of type String|Object.`);
		Error.captureStackTrace(err, _setHeader);
		throw err;
	}

	return this;
};


/**
 * Append additional header `field` with value `val`.
 *
 * @example
 *    res.append.header('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
 *    res.append.header('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
 *    res.append.header('Warning', '199 Miscellaneous warning');
 *
 * @param {string} field
 * @param {string|Array} value
 * @return {ServerResponse} for chaining
 *
 * @alias appendHeader
 * @access public
 */
function _appendHeader(field, value) {
	const prev = this.get(field);
	let _value = value;

	if (prev) {
		// concat the new and prev values:
		_value = Array.isArray(prev) ? prev.concat(value)
			: Array.isArray(value) ? [prev].concat(value)
				: [prev, value]
	}

	return this.setHeader(field, _value);
};


/**
 * Get value for header `key`.
 *
 * @param {string} key
 *
 * @return {string}
 *
 * @alias getHeader
 * @access public
 */
function _getHeader(key) {
	return this.getHeader(key);
};

/**
 * Remove value for header `key`.
 *
 * @param {string} key
 *
 * @return {string}
 *
 * @alias removeHeader
 * @access public
 */
function _removeHeader(key) {
	return this.removeHeader(key);
};
