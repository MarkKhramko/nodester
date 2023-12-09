/**
 * nodester
 * MIT Licensed
 */

'use strict';

const {
	NODESTER_QUERY_ERROR,
} = require('nodester/constants/ErrorCodes');
const {
	NOT_ACCEPTABLE
} = require('nodester/http/codes');

const NodesterError = require('./NodesterError');


/**
 * @class
 *
 * @param {string} [message]
 *
 * @access public
 */
module.exports = class NodesterQueryError extends NodesterError {
	constructor(message) {
		super(message);

		this.status = NOT_ACCEPTABLE;

		Error.captureStackTrace(this, this.constructor);
	}
}
