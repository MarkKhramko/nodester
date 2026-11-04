/**
 * Default 404/error response used when the middleware stack is exhausted.
 */

'use strict';

module.exports = _finalhandler;

function _finalhandler(req, res, options={}) {
	const environment = options.env || process.env.NODE_ENV || 'development';
	const onerror = options.onerror;

	return function handle(error) {
		if (res.headersSent || res._header) {
			if (error && req.socket) {
				req.socket.destroy();
			}
			return;
		}

		const status = error ? errorStatus(error) || responseStatus(res) : 404;
		const headers = error && error.headers && typeof error.headers === 'object' ? error.headers : null;
		const message = error
			? environment === 'production' ? statusMessage(status) : error.stack || String(error)
			: `Cannot ${req.method} ${req.url || '/'}`;

		if (error && onerror) {
			setImmediate(onerror, error, req, res);
		}

		if (headers) {
			for (const key of Object.keys(headers)) {
				res.setHeader(key, headers[key]);
			}
		}

		const body = createHtmlDocument(message);
		res.statusCode = status;
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.setHeader('Content-Length', Buffer.byteLength(body));

		if (req.method === 'HEAD') {
			res.end();
		}
		else {
			res.end(body);
		}
	};
}

function errorStatus(error) {
	for (const key of ['status', 'statusCode']) {
		if (typeof error[key] === 'number' && error[key] >= 400 && error[key] < 600) {
			return error[key];
		}
	}
}

function responseStatus(res) {
	return typeof res.statusCode === 'number' && res.statusCode >= 400 && res.statusCode <= 599
		? res.statusCode
		: 500;
}

function statusMessage(status) {
	return require('http').STATUS_CODES[status] || String(status);
}

function createHtmlDocument(message) {
	const escaped = escapeHtml(message).replace(/\n/g, '<br>').replace(/ {2}/g, ' &nbsp;');
	return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Error</title>\n</head>\n<body>\n<pre>' + escaped + '</pre>\n</body>\n</html>\n';
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
