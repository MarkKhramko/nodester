/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const { ServerResponse } = require('http');

const {
	setHeader,
	appendHeader,
	getHeader,
	removeHeader,
} = require('./headers');

const calculateEtag = require('etag');

// Utils:
const statuses = require('statuses');
const mime = require('mime');
const {
	setCharset
} = require('./utils');


const response = ServerResponse.prototype;

// Mixin custom methods:
response.status = _status;
response.sendStatus = _sendStatus;

response.send = _send;
response.json = _json;

//	Headers:
response.set    = setHeader;
response.append = appendHeader;
response.get    = getHeader;
response.remove = removeHeader;

//	ContentType:
response.setContentType = _setContentType;
response.getContentType = _getContentType;
// Mixins\

module.exports = response;

/**
 * Set status `code`.
 *
 * @param {Number} code
 *
 * @return {ServerResponse}
 *
 * @alias status
 * @api public
 */
function _status(code) {
	this.statusCode = code;
	return this;
};


/**
 * Send given HTTP status code.
 *
 * Sets the response status to `statusCode` and the body of the
 * response to the standard description from node's http.STATUS_CODES
 * or the statusCode number if no description.
 *
 * Examples:
 *
 *     res.sendStatus(200);
 *
 * @param {number} statusCode
 *
 * @alias _sendStatus
 * @api public
 */
function _sendStatus(statusCode) {
	const body = statuses.message[statusCode] || String(statusCode);

	this.statusCode = statusCode;
	this.setContentType('txt');

	return this.send(body);
};

/**
 * Sends a response.
 *
 * Examples:
 *
 *     res.send(Buffer.from('wahoo'));
 *     res.send({ some: 'json' });
 *     res.send('<p>some html</p>');
 *
 * @param {string|number|boolean|object|Buffer} body
 *
 * @alias send
 * @api public
 */
function _send(body) {
	const req = this.req;
	const app = this.app;

	let chunk = body;
	let encoding;
	let type;

	switch (typeof chunk) {
		// strings defaulting to html:
		case 'string':
			if (!this.getContentType()) {
				this.setContentType('html');
			}
			break;
		case 'boolean':
		case 'number':
		case 'object':
			if (chunk === null) {
				chunk = '';
			}
			else if (Buffer.isBuffer(chunk)) {
				if (!this.getContentType()) {
					this.setContentType('bin');
				}
			}
			else {
				return this.json(chunk);
			}
			break;
	}

	// Write strings in utf-8:
	if (typeof chunk === 'string') {
		encoding = 'utf8';
		type = this.getContentType();

		// reflect this in content-type
		if (typeof type === 'string') {
			this.setContentType( setCharset(type, 'utf-8') );
		}
	}

	// Freshness of the REQUEST:
	if (req.fresh) {
		this.statusCode = 304;
	}

	// Strip irrelevant headers for:
	// - 204 (No Content)
	// - 303 (Not Modified)
	if (
		this.statusCode === 204
		||
		this.statusCode === 304
	) {
		this.remove('Content-Type');
		this.remove('Content-Length');
		this.remove('Transfer-Encoding');
		chunk = '';
	}

	// Alter headers for 205 (Reset Content):
	if (this.statusCode === 205) {
		this.set('Content-Length', '0');
		this.remove('Transfer-Encoding');
		chunk = ''
	}

	if (req.method === 'HEAD') {
		// skip body for HEAD.
		this.end();
	}
	else {
		// Calculate etag:
		const etag = calculateEtag(chunk);
		this.set('etag', etag);

		// Respond.
		this.end(chunk, encoding);
	}

	return this;
};


/**
 * Send JSON response.
 *
 * @param {string|number|boolean|object} obj
 *
 * @alias json
 * @api public
 */
function _json(obj) {

	// Ensure content-type:
	if (!this.getContentType()) {
		this.setContentType('application/json');
	}

	const body = JSON.stringify(obj);
	return this.send(body);
};

/**
 * Set _Content-Type_ response header with `type` through `mime.getType()`
 * when it does not contain "/", or set the Content-Type to `type` otherwise.
 *
 * Examples:
 *
 *     res.type('.html');
 *     res.type('html');
 *     res.type('json');
 *     res.type('application/json');
 *     res.type('png');
 *
 * @param {String} type
 *
 * @return {ServerResponse} for chaining
 *
 * @alias setContentType
 * @api public
 */
function _setContentType(type) {
	const contentType = type.indexOf('/') === -1 ?
												mime.getType(type)
												:
												type;

	this.setHeader('Content-Type', contentType);
	return this;
};

/**
 * Returns _Content-Type_ header.
 *
 * @return {String} type
 *
 * @alias getContentType
 * @api public
 */
function _getContentType() {
	return this.getHeader('Content-Type');
};
