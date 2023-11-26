/*!
 * /nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	isValidNumber: _isValidNumber
}

/**
 * @param {Any} numToTest
 *
 * @alias isValidNumber
 * @api public
 */
function _isValidNumber(numToTest){
	return !isNaN(numToTest);
}
