/*!
 * /nodester
 * MIT Licensed
 */

'use strict';


exports = module.exports = {
	error: _error
}

/**
 * Log error using console.error.
 *
 * @param {Array} args
 *
 * @alias error
 * @public
 */

function _error(...args) {
	const activeEnv = process.env.NODE_ENV

	if (activeEnv === 'development' || activeEnv === 'testing') {
  	console.error(...args);
	}
}
