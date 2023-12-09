/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');


module.exports = {
	copyWithCertainAttributes: _copyWithCertainAttributes,
	merge: _merge
}

/**
 * Copy key-value of target object
 *
 * @param {Object} target - Object to copy attributes from
 * @param {Array} attributes - Array of keys
 *
 * @return {Object} New object with attributes of target
 *
 * @alias copyWithCertainAttributes
 * @access public
 */
function _copyWithCertainAttributes(target={}, attributes=[]) {
	ensure(target, 'object,required', 'target');
	ensure(attributes, 'array,required', 'attributes');

	const result = {};

	attributes.forEach(a => result[a] = target[a]);

	return result;
}

/**
 * Merge the property descriptors of `src` into `target`
 *
 * @param {Object} target - Object to add descriptors to
 * @param {Object} src - Object to clone descriptors from
 * @param {boolean} [redefine=true] - Redefine `target` properties with `src` properties
 *
 * @return {Object} Reference to target
 *
 * @alias merge
 *
 * @access public
 */
function _merge (target={}, src={}, redefine=true) {
	ensure(target, 'object,required', 'target');
	ensure(src, 'object,required', 'src');
	ensure(redefine, 'boolean', 'redefine');

	if (redefine === true) {
		target = Object.assign(target, src);
	}
	else {
		Object.getOwnPropertyNames(src)
				.forEach(function forEachOwnPropertyName(name) {
			if (!redefine && hasOwnProperty.call(target, name)) {
				// Skip descriptor.
				return;
			}

			// Copy descriptor:
			const descriptor = Object.getOwnPropertyDescriptor(src, name)
			Object.defineProperty(target, name, descriptor)
		});
	}

	return target;
}
