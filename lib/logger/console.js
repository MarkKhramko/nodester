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
 * @param {Error} err
 *
 * @alias error
 * @public
 */

function _error(err) {
  console.error(err.stack || err.toString());
}
