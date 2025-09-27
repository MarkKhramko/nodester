/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const Enum = require('nodester/enum');


module.exports = new Enum({
	// Core REST methods:
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	PATCH: 'PATCH',
	DELETE: 'DELETE',
	// Additional but common in REST APIs:
	HEAD: 'HEAD',
	OPTIONS: 'OPTIONS',

	// Search and non-standard querying:
	SEARCH: 'SEARCH',
	QUERY: 'QUERY',

	// Rarely used in REST but valid HTTP:
	TRACE: 'TRACE',
	CONNECT: 'CONNECT',
});
