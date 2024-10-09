/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const { IncomingMessage } = require('http');

const isIP = require('net').isIP;
const fresh = require('fresh');
const parse = require('parseurl');

const { defineGetter } = require('./utils');


const req = IncomingMessage.prototype;

module.exports = req;

/**
 * Return request header.
 *
 * The `Referrer` header field is special-cased,
 * both `Referrer` and `Referer` are interchangeable.
 *
 * @example
 *     req.get('Content-Type');
 *     // => "text/plain"
 *
 *     req.get('content-type');
 *     // => "text/plain"
 *
 *     req.get('Something');
 *     // => undefined
 *
 * @param {string} name
 *
 * @return {string}
 * 
 * @alias req.header
 * @access public
 */
req.get =
req.header = function header(name) {
	if (!name) {
		throw new TypeError('name argument is required to req.get');
	}

	if (typeof name !== 'string') {
		throw new TypeError('name must be a string to req.get');
	}

	const lowerCased = name.toLowerCase();

	switch (lowerCased) {
		case 'referer':
		case 'referrer':
			return this.headers.referrer || this.headers.referer;
		default:
			return this.headers[lowerCased];
	}
};


/**
 * Return the protocol string "http" or "https"
 * when requested with TLS. When the "trust proxy"
 * setting trusts the socket address, the
 * "X-Forwarded-Proto" header field will be trusted
 * and used if present.
 *
 * If you're running behind a reverse proxy that
 * supplies https for you this may be enabled.
 *
 * @return {string}
 *
 * @access public
 */
defineGetter(req, 'protocol', function protocol() {
	const proto = this.connection.encrypted
		? 'https'
		: 'http';
	const trust = this.app.get('trust proxy fn');

	if (!trust(this.connection.remoteAddress, 0)) {
		return proto;
	}

	// Note: X-Forwarded-Proto is normally only ever a
	//       single value, but this is to be safe.
	const header = this.get('X-Forwarded-Proto') || proto;
	const index = header.indexOf(',');

	return index !== -1 ?
					header.substring(0, index).trim()
					:
					header.trim();
});


/**
 * Short-hand for `url.parse(req.url).pathname`.
 *
 * @return {string}
 *
 * @access public
 */
defineGetter(req, 'path', function path() {
	return parse(this).pathname;
});


/**
 * Parse the "Host" header field to a hostname.
 * Will return  "X-Forwarded-Host" if set,
 * or "Host" as a fallback.
 *
 * @return {string}
 *
 * @access public
 */
defineGetter(req, 'hostname', function hostname() {
	const host = this.get('X-Forwarded-Host') ?? this.get('Host');
	return host;
});


/**
 * Check if the request is fresh, aka
 * Last-Modified and/or the ETag
 * still match.
 *
 * @return {boolean}
 *
 * @access public
 */
defineGetter(req, 'fresh', function() {
	const method = this.method;
	const res = this.res;
	const status = res.statusCode;

	// GET or HEAD for weak freshness validation only
	if (method !== 'GET' && method !== 'HEAD')
		return false;

	// 2xx or 304 as per rfc2616 14.26
	if ((status >= 200 && status < 300) || 304 === status) {
		return fresh(this.headers, {
			'etag': res.get('etag'),
			'last-modified': res.get('Last-Modified')
		});
	}

	return false;
});


/**
 * Check if the request is stale, aka
 * "Last-Modified" and / or the "ETag" for the
 * resource has changed.
 *
 * @return {boolean}
 *
 * @access public
 */
defineGetter(req, 'stale', function stale() {
	return !this.fresh;
});


/**
 * Check if the request was an _XMLHttpRequest_.
 *
 * @return {boolean}
 *
 * @access public
 */
defineGetter(req, 'xhr', function xhr() {
	const val = this.get('X-Requested-With') || '';
	return val.toLowerCase() === 'xmlhttprequest';
});
