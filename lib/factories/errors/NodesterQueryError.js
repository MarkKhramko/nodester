/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const {
	NODESTER_QUERY_ERROR,
} = require('nodester/constants/ErrorCodes');


module.exports = class NodesterQueryError extends Error {
	constructor(message) {
		super(message);

		this.name = NODESTER_QUERY_ERROR;
		this.status = 422;

		// Remove constructor info from stack.
		Error.captureStackTrace(this, this.constructor);
	}
}
