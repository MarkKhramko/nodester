/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const {
	HTTP_CODE_UNPROCESSABLE_ENTITY
} = require('nodester/http/codes');

const cookie = require('cookie');
const cookieSignature = require('cookie-signature');

const { createErrorResponse } = require('nodester/factories/responses/rest');


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

		return next();
	}
	catch(error) {
		return createErrorResponse(res, {
			error: error,
			status: error.status ?? HTTP_CODE_UNPROCESSABLE_ENTITY
		});
	}
}
