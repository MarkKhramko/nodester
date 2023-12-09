/**
 * nodester
 * MIT Licensed
 */
 
'use strict';


module.exports = function initSearchParamsMiddleware() {
	return handle;
}

function handle(req, res, next) {
	// If no query, skip:
	if (req.url.indexOf('?') === -1) {
		return next();
	}

	const querystring = req.url.split('?')[1];
	const params = new URLSearchParams(querystring);

	req.searchParams = params;

	return next();
}
