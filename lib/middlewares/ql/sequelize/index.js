/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const QueryLexer = require('./interpreter/QueryLexer');
const httpCodes = require('nodester/http/codes');


module.exports = function initNodesterQL() {
	return nqlHandle;
};

async function nqlHandle(req, res, next) {
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
		next();
	}
	catch(error) {
		res.status(error.status ?? httpCodes.UNPROCESSABLE_ENTITY);
		res.json({ error: error.toString() });
	}
}
