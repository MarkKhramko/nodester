/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

module.exports = {
	defineGetter: _defineGetter
}

/**
 * Helper function for creating a getter on an object.
 *
 * @param {Object} obj
 * @param {String} name
 * @param {Function} getter
 *
 * @api private
 */
function _defineGetter(obj, name, getter) {
	Object.defineProperty(obj, name, {
		configurable: true,
		enumerable: true,
		get: getter
	});
}
