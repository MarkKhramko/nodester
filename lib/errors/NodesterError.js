/**
 * nodester
 * MIT Licensed
 */

'use strict';


/**
 * @class
 *
 * @param {string} [message]
 * @param {string|Int} [status]
 *
 * @access public
 */
module.exports = class NodesterError extends Error {
	constructor(message, status) {
		super(message);
		
		this.name = this.constructor.name;
		this.status = status;

		Error.captureStackTrace(this, this.constructor);
	}
}
