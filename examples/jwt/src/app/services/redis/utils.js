
module.exports = {
	dateTimeToTTL: _dateTimeToTTL,
	stringify: _stringify
}

/**
 * Convert a future Date to a TTL in seconds.
 *
 * @param {Date} dateTime - Expiration timestamp.
 * @returns {number} TTL in seconds (never negative).
 */
function _dateTimeToTTL(dateTime) {
	const now = Date.now();
	const diffMs = dateTime.getTime() - now;
	return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * JSON-stringify objects automatically.
 *
 * @param {*} value - Any value.
 * @returns {string} JSON string or the raw value converted to string.
 */
function _stringify(value) {
	if (value === null || value === undefined)
		return '';

	if (typeof value === 'object')
		return JSON.stringify(value);

	return String(value);
}
