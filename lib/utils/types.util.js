const objectRegExp = /^\[object (\S+)\]$/;


module.exports = {
	typeOf: _typeOf
}


/**
 *
 * @alias typeOf
 * @public
 */
function _typeOf(obj) {
	const type = typeof obj;

	if (type !== 'object') {
		return type;
	}

	// Inspect [[Class]] for objects:
	return Object.prototype
							 .toString
							 .call(obj)
							 .replace(objectRegExp, '$1');
}
