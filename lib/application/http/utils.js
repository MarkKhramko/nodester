/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const contentType = require('content-type');
const mime = require('send').mime;
const etag = require('etag');
const proxyaddr = require('proxy-addr');
const qs = require('qs');
const querystring = require('querystring');


exports = module.exports = {
	acceptParams: _acceptParams,
	normalizeType: _normalizeType,
	normalizeTypes: _normalizeTypes,
	compileETag: _compileETag,
	setCharset: _setCharset
}


/**
 * Parse accept params `str` returning an
 * object with `.value`, `.quality` and `.params`.
 * also includes `.originalIndex` for stable sorting
 *
 * @param {String} str
 * @param {Number} index
 * @return {Object}
 *
 * @api private
 */
function _acceptParams(str, index) {
	const parts = str.split(/ *; */);
	let result = { value: parts[0], quality: 1, params: {}, originalIndex: index };

	for (let i = 1; i < parts.length; i++) {
		const pms = parts[i].split(/ *= */);
		if ('q' === pms[0]) {
			result.quality = parseFloat(pms[1]);
		} else {
			result.params[pms[0]] = pms[1];
		}
	}

	return result;
}


/**
 * Create an ETag generator function, generating ETags with
 * the given options.
 *
 * @param {object} options
 * @return {function}
 *
 * @private
 */
function _createETagGenerator (options) {
	return function generateETag (body, encoding) {
		const buf = !Buffer.isBuffer(body)
			? Buffer.from(body, encoding)
			: body

		return etag(buf, options)
	}
}


/**
 * Normalize the given `type`, for example "html" becomes "text/html".
 *
 * @param {String} type
 * @return {Object}
 *
 * @api private
 */
function _normalizeType(type){
	return ~type.indexOf('/')
		? acceptParams(type)
		: { value: mime.lookup(type), params: {} };
};


/**
 * Normalize `types`, for example "html" becomes "text/html".
 *
 * @param {Array} types
 * @return {Array}
 *
 * @api private
 */
function _normalizeTypes(types){
	const ret = [];

	for (let i = 0; i < types.length; ++i) {
		ret.push(
			_normalizeType(types[i])
		);
	}

	return ret;
};


/**
 * Compile "etag" value to function.
 *
 * @param  {Boolean|String|Function} val
 * @return {Function}
 *
 * @alias compileETag
 * @api public
 */
function _compileETag(val) {
	let fn;

	if (typeof val === 'function') {
		return val;
	}

	switch (val) {
		case true:
		case 'weak':
			fn = _createETagGenerator({ weak: true });
			break;
		case false:
			break;
		case 'strong':
			fn = _createETagGenerator({ weak: false });
			break;
		default:
			throw new TypeError('unknown value for etag function: ' + val);
	}

	return fn;
}

/**
 * Compile "query parser" value to function.
 *
 * @param  {String|Function} val
 * @return {Function}
 *
 * @api private
 */

exports.compileQueryParser = function compileQueryParser(val) {
	let fn;

	if (typeof val === 'function') {
		return val;
	}

	switch (val) {
		case true:
		case 'simple':
			fn = querystring.parse;
			break;
		case false:
			fn = newObject;
			break;
		case 'extended':
			fn = parseExtendedQueryString;
			break;
		default:
			throw new TypeError('unknown value for query parser function: ' + val);
	}

	return fn;
}

/**
 * Compile "proxy trust" value to function.
 *
 * @param  {Boolean|String|Number|Array|Function} val
 * @return {Function}
 *
 * @api private
 */
exports.compileTrust = function(val) {
	if (typeof val === 'function') return val;

	if (val === true) {
		// Support plain true/false
		return function(){ return true };
	}

	if (typeof val === 'number') {
		// Support trusting hop count
		return function(a, i){ return i < val };
	}

	if (typeof val === 'string') {
		// Support comma-separated values
		val = val.split(',')
			.map(function (v) { return v.trim() })
	}

	return proxyaddr.compile(val || []);
}


/**
 * Set the charset in a given Content-Type string.
 *
 * @param {String} type
 * @param {String} charset
 * @return {String}
 *
 * @api private
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
};


/**
 * Parse an extended query string with qs.
 *
 * @return {Object}
 * @private
 */
function parseExtendedQueryString(str) {
	return qs.parse(str, {
		allowPrototypes: true
	});
}


/**
 * Return new empty object.
 *
 * @return {Object}
 *
 * @api private
 */
function newObject() {
	return {};
}

