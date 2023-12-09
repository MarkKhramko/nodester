/**
 * nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	isValidNumber: _isValidNumber
}

/**
 * @param {any} numToTest
 *
 * @alias isValidNumber
 * @access public
 */
function _isValidNumber(numToTest){
	return !isNaN(numToTest);
}
