/**
 * nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	isValidDate: _isValidDate
}

/**
 * @param {any} dateToTest
 *
 * @alias isValidDate
 * @access public
 */
function _isValidDate(dateToTest) {
	// If number:
	if (!isNaN(dateToTest)) {
		return false;
	}

	if (typeof dateToTest === 'string') {
		const date = new Date(dateToTest);
		return date.toString() !== 'Invalid Date';
	}

  return dateToTest instanceof Date;
}
