/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const {
	HTTP_CODE_UNPROCESSABLE_ENTITY
} = require('nodester/http/codes');

const QueryLexer = require('./interpreter/QueryLexer');
const { createErrorResponse } = require('nodester/factories/responses/rest');


module.exports = function initNodesterQL() {
	return nqlHandle;
};

function nqlHandle(req, res, next) {
	// Object, which will be populated with parsed query.
	req.nquery = {};

	// Unwrap neccessary params.
	const {
		url
	} = req;

	// If no query, skip:
	if (url.indexOf('?') === -1) {
		return next();
	}

	try {
		const queryString = req.url.split('?')[1];

		const lexer = new QueryLexer(queryString);

		// Go on!
		req.nquery = lexer.query;
		return next();
	}
	catch(error) {
		return createErrorResponse(res, {
			error: error,
			status: error.status ?? HTTP_CODE_UNPROCESSABLE_ENTITY
		});
	}
}
