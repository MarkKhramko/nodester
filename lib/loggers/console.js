/**
 * nodester
 * MIT Licensed
 */

'use strict';


exports = module.exports = {
	error: _error,
	warn: _warn
}

/**
 * Log error using console.error.
 *
 * @param {Error} err
 *
 * @alias error
 * @access public
 */
function _error(err) {
	console.error(err.stack || err.toString());
}


/**
 * Log warning with nodester prefix using console.warning.
 *
 * @param {Error} err
 *
 * @alias error
 * @access public
 */
function _warn(...args) {
	const prefix = '[nodester] warning:';
	console.warn(prefix, ...args);
}
