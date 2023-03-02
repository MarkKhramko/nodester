
module.exports = {
	isValidDate: _isValidDate
}


/**
 * @param {String|Date} dateOrString
 *
 * @alias isValidDate
 * @public
 */
function _isValidDate(dateOrString) {
	if (typeof dateOrString === 'string') {
		const date = new Date(dateOrString);
		return date.toString() !== 'Invalid Date';
	}

  return dateOrString instanceof Date && !isNaN(dateOrString);
}
