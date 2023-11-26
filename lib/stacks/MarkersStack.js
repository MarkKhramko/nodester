/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:MiddlewareStack');


module.exports = class MarkersStack {
	constructor() {
		this.markers = new Map();
	}


	/**
	 * Add the given middleware `fn` to the stack.
	 *
	 * @param {String} markerName
	 * @param {Function} fn
	 * @return {Integer} index of new middleware
	 *
	 * @api public
	 */
	add(markerName='', fn) {
		return this.markers.set(markerName, fn);
	}


	/**
	 * Get middleware function by marker name.
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	get(markerName='') {
		return this.markers.get(markerName);
	}
}
