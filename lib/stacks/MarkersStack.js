/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

// Arguments validator.
const { ensure } = require('../validators/arguments');

// Console:
const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:MiddlewareStack');


/*
 * Creates new MarkersStack.
 *
 * @return {MarkersStack}
 *
 */
module.exports = class MarkersStack {
	constructor() {
		this._markers = new Map();
	}

	get markers() {
		return this._markers;
	}

	/**
	 * Add the given middleware `fn` to the stack.
	 *
	 * @param {String} markerName
	 * @param {Function} fn
	 *
	 * @return {Integer} index of new middleware
	 *
	 * @api public
	 */
	add(markerName='', fn) {
		try {
			ensure(markerName, 'string,required', 'markerName');
			ensure(fn, 'function,required', 'fn');

			return this._markers.set(markerName, fn);
		}
		catch(error) {
			Error.captureStackTrace(error, this.add);
			throw error;
		}
	}


	/**
	 * Get middleware function by marker name.
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	get(markerName='') {
		try {
			ensure(markerName, 'string,required', 'markerName');

			return this._markers.get(markerName);
		}
		catch(error) {
			Error.captureStackTrace(error, this.get);
			throw error;
		}
	}
}
