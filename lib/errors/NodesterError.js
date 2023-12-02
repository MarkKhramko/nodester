/*!
 * /nodester
 * MIT Licensed
 */

'use strict';


module.exports = class NodesterError extends Error {
	constructor(message, status) {
		super(message);
		
		this.name = this.constructor.name;
		this.status = status;

		Error.captureStackTrace(this, this.constructor);
	}
}
