/*!
 * /nodester
 * MIT Licensed
 */
'use strict';


module.exports = {
	copyWithCertainAttributes: _copyWithCertainAttributes,
	merge: _merge
}

/**
 * Copy key-value of target object
 *
 * @param {object} targetObj Object to copy attributes from
 * @param {array} attributes Array of keys
 * @returns {object} New object with attributes of targetObj
 *
 * @alias copyWithCertainAttributes
 * @public
 */
function _copyWithCertainAttributes(targetObj={}, attributes=[]) {
	const result = {};

	attributes.forEach(a => result[a] = targetObj[a]);

	return result;
}

/**
 * Merge the property descriptors of `src` into `dest`
 *
 * @param {object} dest Object to add descriptors to
 * @param {object} src Object to clone descriptors from
 * @param {boolean} [redefine=true] Redefine `dest` properties with `src` properties
 * @returns {object} Reference to dest
 *
 * @alias merge
 * @public
 */
function _merge (dest={}, src={}, redefine=true) {
	if (!dest) {
		throw new TypeError('argument dest is required')
	}

	if (!src) {
		throw new TypeError('argument src is required')
	}

	if (redefine === true) {
		dest = Object.assign(dest, src);
	}
	else {
		Object.getOwnPropertyNames(src)
				.forEach(function forEachOwnPropertyName(name) {
			if (!redefine && hasOwnProperty.call(dest, name)) {
				// Skip descriptor.
				return;
			}

			// Copy descriptor:
			const descriptor = Object.getOwnPropertyDescriptor(src, name)
			Object.defineProperty(dest, name, descriptor)
		});
	}

	return dest;
}
