/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const cookie = require('cookie');
const cookieSignature = require('cookie-signature');


module.exports = function initCookiesMiddleware(options={}) {
	const context = {
		options
	}
	return cookiesHandle.bind(context);
};

function cookiesHandle(req, res, next) {
	try {
		if (req.headers.cookie === undefined) {
			req.cookies = {};
			return next();
		}

		const cookies = cookie.parse(req.headers.cookie);
		req.cookies = cookies;

		next();
	}
	catch(error) {
		console.error(error);

		const statusCode = error.status || 406;
		res.status(statusCode);
		res.json({
			error: {
				message: error.message,
				code: statusCode
			},
			status: statusCode
		});
	}
}
