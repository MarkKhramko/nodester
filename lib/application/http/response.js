/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

// Constants.
const charsetRegExp = /;\s*charset\s*=/;

// Utils:
const contentDisposition = require('content-disposition');
const createError = require('http-errors')
const encodeUrl = require('encodeurl');
const escapeHtml = require('escape-html');
const http = require('http');
const onFinished = require('on-finished');
const statuses = require('statuses')
const sign = require('cookie-signature').sign;
const cookie = require('cookie');
const send = require('send');
const mime = send.mime;
const vary = require('vary');
const {
	normalizeType,
	normalizeTypes,
	setCharset
} = require('./utils');
const path = require('path');
const extname = path.extname;
const resolve = path.resolve;
const { isAbsolute } = require('../../utils/path.util');


const res = http.ServerResponse.prototype;
module.exports = res;

/**
 * Set status `code`.
 *
 * @param {Number} code
 * @return {ServerResponse}
 *
 * @public
 */
res.status = function status(code) {
	this.statusCode = code;
	return this;
};


/**
 * Set Link header field with the given `links`.
 *
 * Examples:
 *
 *    res.links({
 *      next: 'http://api.example.com/users?page=2',
 *      last: 'http://api.example.com/users?page=5'
 *    });
 *
 * @param {Object} links
 * @return {ServerResponse}
 *
 * @public
 */
res.links = function(links){
	const link = this.get('Link') || '';
	
	if (link) {
		link += ', ';
	}

	const linkRel = Object.keys(links)
												.map((rel) => '<' + links[rel] + '>; rel="' + rel + '"')
												.join(', ');
	this.set('Link', link + linkRel);
};


/**
 * Send a response.
 *
 * Examples:
 *
 *     res.send(Buffer.from('wahoo'));
 *     res.send({ some: 'json' });
 *     res.send('<p>some html</p>');
 *
 * @param {string|number|boolean|object|Buffer} body
 *
 * @public
 */
res.send = function send(body) {
	const req = this.req;

	let chunk = body;
	let encoding;
	let type;

	// Settings.
	const app = this.app;

	switch (typeof chunk) {
		// string defaulting to html
		case 'string':
			if (!this.get('Content-Type')) {
				this.type('html');
			}
			break;
		case 'boolean':
		case 'number':
		case 'object':
			if (chunk === null) {
				chunk = '';
			}
			else if (Buffer.isBuffer(chunk)) {
				if (!this.get('Content-Type')) {
					this.type('bin');
				}
			}
			else {
				return this.json(chunk);
			}
			break;
	}

	// write strings in utf-8
	if (typeof chunk === 'string') {
		encoding = 'utf8';
		type = this.get('Content-Type');

		// reflect this in content-type
		if (typeof type === 'string') {
			this.set('Content-Type', setCharset(type, 'utf-8'));
		}
	}

	// freshness:
	// if (req.fresh) {
	// 	this.statusCode = 304;
	// }

	// Strip irrelevant headers for:
	// - 204 (No Content)
	// - 303 (Not Modified)
	if (
		this.statusCode === 204
		||
		this.statusCode === 304
	) {
		this.removeHeader('Content-Type');
		this.removeHeader('Content-Length');
		this.removeHeader('Transfer-Encoding');
		chunk = '';
	}

	// Alter headers for 205 (Reset Content):
	if (this.statusCode === 205) {
		this.set('Content-Length', '0')
		this.removeHeader('Transfer-Encoding')
		chunk = ''
	}

	if (req.method === 'HEAD') {
		// skip body for HEAD.
		this.end();
	}
	else {
		// Respond.
		this.end(chunk, encoding);
	}

	return this;
};


/**
 * Send JSON response.
 *
 * Examples:
 *
 *     res.json(null);
 *     res.json({ user: 'tj' });
 *
 * @param {string|number|boolean|object} obj
 *
 * @public
 */
res.json = function json(obj) {

	// If content-type not set:
	if (!this.get('Content-Type')) {
		this.set('Content-Type', 'application/json');
	}

	const body = JSON.stringify(obj);
	return this.send(body);
};


/**
 * Send JSON response with JSONP callback support.
 *
 * Examples:
 *
 *     res.jsonp(null);
 *     res.jsonp({ user: 'tj' });
 *
 * @param {string|number|boolean|object} obj
 *
 * @public
 */
res.jsonp = function jsonp(val) {
	const app = this.app;
	// Settings:
	const escape = app.get('json escape')
	const replacer = app.get('json replacer');
	const spaces = app.get('json spaces');

	let body = stringify(val, replacer, spaces, escape)
	let callback = this.req.query[app.get('jsonp callback name')];

	// content-type
	if (!this.get('Content-Type')) {
		this.set('X-Content-Type-Options', 'nosniff');
		this.set('Content-Type', 'application/json');
	}

	// fixup callback
	if (Array.isArray(callback)) {
		callback = callback[0];
	}

	// jsonp
	if (typeof callback === 'string' && callback.length !== 0) {
		this.set('X-Content-Type-Options', 'nosniff');
		this.set('Content-Type', 'text/javascript');

		// restrict callback charset
		callback = callback.replace(/[^\[\]\w$.]/g, '');

		if (body === undefined) {
			// empty argument.
			body = '';
		}
		else if (typeof body === 'string') {
			// replace chars not allowed in JavaScript that are in JSON.
			body = body.replace(/\u2028/g, '\\u2028')
								 .replace(/\u2029/g, '\\u2029');
		}

		// the /**/ is a specific security mitigation for "Rosetta Flash JSONP abuse"
		// the typeof check is just to reduce client error noise
		body = '/**/ typeof ' + callback + ' === \'function\' && ' + callback + '(' + body + ');';
	}

	return this.send(body);
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
 * @public
 */
res.sendStatus = function sendStatus(statusCode) {
	const body = statuses.message[statusCode] || String(statusCode)

	this.statusCode = statusCode;
	this.type('txt');

	return this.send(body);
};


/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `callback(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.headersSent`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
 *   - `root`     root directory for relative filenames
 *   - `headers`  object of headers to serve with file
 *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendFile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendFile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     app.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *       req.user.mayViewFilesFrom(uid, function(yes){
 *         if (yes) {
 *           res.sendFile('/uploads/' + uid + '/' + file);
 *         }
 else {
 *           res.send(403, 'Sorry! you cant see that.');
 *         }
 *       });
 *     });
 *
 * @public
 */
res.sendFile = function sendFile(path, options, callback) {
	const req = this.req;
	const res = this;
	const next = req.next;
	
	let opts = options || {};
	let done = callback;

	if (!path) {
		throw new TypeError('path argument is required to res.sendFile');
	}

	if (typeof path !== 'string') {
		throw new TypeError('path must be a string to res.sendFile')
	}

	// support function as second arg
	if (typeof options === 'function') {
		done = options;
		opts = {};
	}

	if (!opts.root && !isAbsolute(path)) {
		throw new TypeError('path must be absolute or specify root to res.sendFile');
	}

	// create file stream
	const pathname = encodeURI(path);
	const file = send(req, pathname, opts);

	// transfer
	sendfile(res, file, opts, function (err) {
		if (done)
			return done(err);

		if (err && err.code === 'EISDIR')
			return next();

		// next() all but write errors
		if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
			next(err);
		}
	});
};


/**
 * Transfer the file at the given `path`.
 *
 * Automatically sets the _Content-Type_ response header field.
 * The callback `callback(err)` is invoked when the transfer is complete
 * or when an error occurs. Be sure to check `res.headersSent`
 * if you wish to attempt responding, as the header and some data
 * may have already been transferred.
 *
 * Options:
 *
 *   - `maxAge`   defaulting to 0 (can be string converted by `ms`)
 *   - `root`     root directory for relative filenames
 *   - `headers`  object of headers to serve with file
 *   - `dotfiles` serve dotfiles, defaulting to false; can be `"allow"` to send them
 *
 * Other options are passed along to `send`.
 *
 * Examples:
 *
 *  The following example illustrates how `res.sendfile()` may
 *  be used as an alternative for the `static()` middleware for
 *  dynamic situations. The code backing `res.sendfile()` is actually
 *  the same code, so HTTP cache support etc is identical.
 *
 *     app.get('/user/:uid/photos/:file', function(req, res){
 *       var uid = req.params.uid
 *         , file = req.params.file;
 *
 *       req.user.mayViewFilesFrom(uid, function(yes){
 *         if (yes) {
 *           res.sendfile('/uploads/' + uid + '/' + file);
 *         }
 else {
 *           res.send(403, 'Sorry! you cant see that.');
 *         }
 *       });
 *     });
 *
 * @public
 */
res.sendfile = function (path, options, callback) {
	const req = this.req;
	const res = this;
	const next = req.next;
	
	let opts = options || {};
	let done = callback;

	// support function as second arg
	if (typeof options === 'function') {
		done = options;
		opts = {};
	}

	// create file stream
	const file = send(req, path, opts);

	// transfer
	sendfile(res, file, opts, function (err) {
		if (done)
			return done(err);

		if (err && err.code === 'EISDIR')
			return next();

		// next() all but write errors
		if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write') {
			next(err);
		}
	});
};


/**
 * Transfer the file at the given `path` as an attachment.
 *
 * Optionally providing an alternate attachment `filename`,
 * and optional callback `callback(err)`. The callback is invoked
 * when the data transfer is complete, or when an error has
 * occurred. Be sure to check `res.headersSent` if you plan to respond.
 *
 * Optionally providing an `options` object to use with `res.sendFile()`.
 * This function will set the `Content-Disposition` header, overriding
 * any `Content-Disposition` header passed as header options in order
 * to set the attachment and filename.
 *
 * This method uses `res.sendFile()`.
 *
 * @public
 */
res.download = function download (path, filename, options, callback) {
	let done = callback;
	let name = filename;
	let opts = options || null

	// support function as second or third arg
	if (typeof filename === 'function') {
		done = filename;
		name = null;
		opts = null
	}
	else if (typeof options === 'function') {
		done = options
		opts = null
	}

	// support optional filename, where options may be in it's place
	if (typeof filename === 'object' &&
		(typeof options === 'function' || options === undefined)) {
		name = null
		opts = filename
	}

	// set Content-Disposition when file is sent
	const headers = {
		'Content-Disposition': contentDisposition(name || path)
	};

	// merge user-provided headers
	if (opts && opts.headers) {
		const keys = Object.keys(opts.headers)
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i]
			if (key.toLowerCase() !== 'content-disposition') {
				headers[key] = opts.headers[key]
			}
		}
	}

	// merge user-provided options
	opts = Object.create(opts)
	opts.headers = headers

	// Resolve the full path for sendFile
	const fullPath = !opts.root ?
											resolve(path)
											:
											path;

	// send file
	return this.sendFile(fullPath, opts, done)
};


/**
 * Set _Content-Type_ response header with `type` through `mime.lookup()`
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
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.contentType =
res.type = function contentType(type) {
	const _contentType = type.indexOf('/') === -1 ?
												mime.lookup(type)
												:
												type;

	return this.set('Content-Type', _contentType);
};


/**
 * Respond to the Acceptable formats using an `obj`
 * of mime-type callbacks.
 *
 * This method uses `req.accepted`, an array of
 * acceptable types ordered by their quality values.
 * When "Accept" is not present the _first_ callback
 * is invoked, otherwise the first match is used. When
 * no match is performed the server responds with
 * 406 "Not Acceptable".
 *
 * Content-Type is set for you, however if you choose
 * you may alter this within the callback using `res.type()`
 * or `res.set('Content-Type', ...)`.
 *
 *    res.format({
 *      'text/plain': function(){
 *        res.send('hey');
 *      },
 *
 *      'text/html': function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      'application/json': function () {
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * In addition to canonicalized MIME types you may
 * also use extnames mapped to these types:
 *
 *    res.format({
 *      text: function(){
 *        res.send('hey');
 *      },
 *
 *      html: function(){
 *        res.send('<p>hey</p>');
 *      },
 *
 *      json: function(){
 *        res.send({ message: 'hey' });
 *      }
 *    });
 *
 * By default Express passes an `Error`
 * with a `.status` of 406 to `next(err)`
 * if a match is not made. If you provide
 * a `.default` callback it will be invoked
 * instead.
 *
 * @param {Object} obj
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.format = function(obj){
	const req = this.req;
	const next = req.next;

	const keys = Object.keys(obj)
									 .filter((v) => v !== 'default');

	const key = keys.length > 0 ?
								req.accepts(keys)
								:
								false;

	this.vary('Accept');

	if (key) {
		this.set('Content-Type', normalizeType(key).value);
		obj[key](req, this, next);
	}
	else if (obj.default) {
		obj.default(req, this, next)
	}
	else {
		next(createError(406, {
			types: normalizeTypes(keys).map( o => o.value )
		}))
	}

	return this;
};


/**
 * Set _Content-Disposition_ header to _attachment_ with optional `filename`.
 *
 * @param {String} filename
 * @return {ServerResponse}
 *
 * @public
 */
res.attachment = function attachment(filename) {
	if (filename) {
		this.type(extname(filename));
	}

	this.set('Content-Disposition', contentDisposition(filename));

	return this;
};


/**
 * Append additional header `field` with value `val`.
 *
 * Example:
 *
 *    res.append('Link', ['<http://localhost/>', '<http://localhost:3000/>']);
 *    res.append('Set-Cookie', 'foo=bar; Path=/; HttpOnly');
 *    res.append('Warning', '199 Miscellaneous warning');
 *
 * @param {String} field
 * @param {String|Array} val
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.append = function append(field, val) {
	const prev = this.get(field);
	let value = val;

	if (prev) {
		// concat the new and prev vals
		value = Array.isArray(prev) ? prev.concat(val)
			: Array.isArray(val) ? [prev].concat(val)
				: [prev, val]
	}

	return this.set(field, value);
};


/**
 * Set header `field` to `val`, or pass
 * an object of header fields.
 *
 * Examples:
 *
 *    res.set('Foo', ['bar', 'baz']);
 *    res.set('Accept', 'application/json');
 *    res.set({ Accept: 'text/plain', 'X-API-Key': 'tobi' });
 *
 * Aliased as `res.header()`.
 *
 * @param {String|Object} field
 * @param {String|Array} val
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.set =
res.header = function header(field, val) {
	if (arguments.length === 2) {
		let value = Array.isArray(val) ?
									val.map(String)
									:
									String(val);

		// add charset to content-type
		if (field.toLowerCase() === 'content-type') {
			if (Array.isArray(value)) {
				throw new TypeError('Content-Type cannot be set to an Array');
			}

			if (!charsetRegExp.test(value)) {
				const charset = mime.charsets.lookup(value.split(';')[0]);
				
				if (charset) {
					value += '; charset=' + charset.toLowerCase();
				}
			}
		}

		this.setHeader(field, value);
	}
	else {
		for (let key in field) {
			this.set(key, field[key]);
		}
	}
	return this;
};


/**
 * Get value for header `field`.
 *
 * @param {String} field
 * @return {String}
 *
 * @public
 */
res.get = function(field){
	return this.getHeader(field);
};


/**
 * Clear cookie `name`.
 *
 * @param {String} name
 * @param {Object} [options]
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.clearCookie = function clearCookie(name, options) {
	const defaultOpts = { expires: new Date(1), path: '/' };
	const opts = merge(defaultOpts, options);

	return this.cookie(name, '', opts);
};


/**
 * Set cookie `name` to `value`, with the given `options`.
 *
 * Options:
 *
 *    - `maxAge`   max-age in milliseconds, converted to `expires`
 *    - `signed`   sign the cookie
 *    - `path`     defaults to "/"
 *
 * Examples:
 *
 *    // "Remember Me" for 15 minutes
 *    res.cookie('rememberme', '1', { expires: new Date(Date.now() + 900000), httpOnly: true });
 *
 *    // same as above
 *    res.cookie('rememberme', '1', { maxAge: 900000, httpOnly: true })
 *
 * @param {String} name
 * @param {String|Object} value
 * @param {Object} [options]
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.cookie = function (name, value, options) {
	let opts = merge({}, options);
	const secret = this.req.secret;
	const signed = !!opts.signed;

	if (signed && !secret) {
		throw new Error('cookieParser("secret") required for signed cookies');
	}

	let val = typeof value === 'object'
		? 'j:' + JSON.stringify(value)
		: String(value);

	if (signed) {
		val = 's:' + sign(val, secret);
	}

	if (opts.maxAge != null) {
		const maxAge = opts.maxAge - 0

		if (!isNaN(maxAge)) {
			opts.expires = new Date(Date.now() + maxAge)
			opts.maxAge = Math.floor(maxAge / 1000)
		}
	}

	if (opts.path == null) {
		opts.path = '/';
	}

	this.append('Set-Cookie', cookie.serialize(name, String(val), opts));

	return this;
};


/**
 * Set the location header to `url`.
 *
 * The given `url` can also be "back", which redirects
 * to the _Referrer_ or _Referer_ headers or "/".
 *
 * Examples:
 *
 *    res.location('/foo/bar').;
 *    res.location('http://example.com');
 *    res.location('../login');
 *
 * @param {String} url
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.location = function location(url) {
	let to = url;

	// "back" is an alias for the referrer
	if (url === 'back') {
		to = this.req.get('Referrer') || '/';
	}

	// set location
	return this.set('Location', encodeUrl(to));
};


/**
 * Redirect to the given `url` with optional response `status`
 * defaulting to 302.
 *
 * The resulting `url` is determined by `res.location()`, so
 * it will play nicely with mounted apps, relative paths,
 * `"back"` etc.
 *
 * Examples:
 *
 *    res.redirect('/foo/bar');
 *    res.redirect('http://example.com');
 *    res.redirect(301, 'http://example.com');
 *    res.redirect('../login'); // /blog/post/1 -> /blog/login
 *
 * @public
 */
res.redirect = function redirect(url) {
	let address = url;
	let body;
	let status = 302;

	// allow status / url
	if (arguments.length === 2) {
		if (typeof arguments[0] === 'number') {
			status = arguments[0];
			address = arguments[1];
		}
		else {
			deprecate('res.redirect(url, status): Use res.redirect(status, url) instead');
			status = arguments[1];
		}
	}

	// Set location header
	address = this.location(address).get('Location');

	// Support text/{plain,html} by default
	this.format({
		text: function(){
			body = statuses.message[status] + '. Redirecting to ' + address
		},

		html: function(){
			const url = escapeHtml(address);
			body = '<p>' + statuses.message[status] + '. Redirecting to <a href="' + url + '">' + url + '</a></p>'
		},

		default: function(){
			body = '';
		}
	});

	// Respond
	this.statusCode = status;
	this.set('Content-Length', Buffer.byteLength(body));

	if (this.req.method === 'HEAD') {
		this.end();
	}
	else {
		this.end(body);
	}
};


/**
 * Add `field` to Vary. If already present in the Vary set, then
 * this call is simply ignored.
 *
 * @param {Array|String} field
 * @return {ServerResponse} for chaining
 *
 * @public
 */
res.vary = function(field) {
	vary(this, field);
	return this;
};


/**
 * Render `view` with the given `options` and optional callback `fn`.
 * When a callback function is given a response will _not_ be made
 * automatically, otherwise a response of _200_ and _text/html_ is given.
 *
 * Options:
 *
 *  - `cache`     boolean hinting to the engine it should cache
 *  - `filename`  filename of the view being rendered
 *
 * @public
 */
res.render = function render(view, options, callback) {
	const app = this.req.app;
	let done = callback;
	let opts = options || {};
	const req = this.req;
	const self = this;

	// support callback function as second arg
	if (typeof options === 'function') {
		done = options;
		opts = {};
	}

	// merge res.locals
	opts._locals = self.locals;

	// default callback to respond
	done = done || function (err, str) {
		if (err) return req.next(err);
		self.send(str);
	};

	// render
	app.render(view, opts, done);
};

// pipe the send file stream
function sendfile(res, file, options, callback) {
	let done = false;
	let streaming;

	// request aborted
	function onaborted() {
		if (done) return;
		done = true;

		const err = new Error('Request aborted');
		err.code = 'ECONNABORTED';
		callback(err);
	}

	// directory
	function ondirectory() {
		if (done)
			return;

		done = true;

		const err = new Error('EISDIR, read');
		err.code = 'EISDIR';
		callback(err);
	}

	// errors
	function onerror(err) {
		if (done)
			return;

		done = true;
		callback(err);
	}

	// ended
	function onend() {
		if (done)
			return;

		done = true;
		callback();
	}

	// file
	function onfile() {
		streaming = false;
	}

	// finished
	function onfinish(err) {
		if (err && err.code === 'ECONNRESET')
			return onaborted();

		if (err)
			return onerror(err);

		if (done)
			return;

		setImmediate(function () {
			if (streaming !== false && !done) {
				onaborted();
				return;
			}

			if (done) return;
			done = true;
			callback();
		});
	}

	// streaming
	function onstream() {
		streaming = true;
	}

	file.on('directory', ondirectory);
	file.on('end', onend);
	file.on('error', onerror);
	file.on('file', onfile);
	file.on('stream', onstream);
	onFinished(res, onfinish);

	if (options.headers) {
		// set headers on successful transfer
		file.on('headers', function headers(res) {
			const _headers = options.headers;
			const keys = Object.keys(_headers);

			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				res.setHeader(key, _headers[k]);
			}
		});
	}

	// pipe
	file.pipe(res);
}
