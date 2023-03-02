
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
