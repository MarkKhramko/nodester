/**
 * nodester
 * MIT Licensed
 */

'use strict';

const {
	NOT_ACCEPTABLE
} = require('nodester/http/codes');


/**
 * @class
 *
 * @param {string} [message]
 *
 * @access public
 */
module.exports = class NodesterQueryError extends Error {
	constructor(message, status) {
		super(message);

		this.name = this.constructor.name;
		this.status = status ?? NOT_ACCEPTABLE;

		Error.captureStackTrace(this, this.constructor);
	}
}
