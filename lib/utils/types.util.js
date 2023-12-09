/**
 * nodester
 * MIT Licensed
 */

'use strict';

const objectRegExp = /^\[object (\S+)\]$/;


module.exports = {
	typeOf: _typeOf,
	isAsync: _isAsync,
	isRegExp: _isRegExp,
	isConstructor: _isConstructor
}


/**
 *
 * @alias typeOf
 * @acess public
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


/**
 *
 * @alias isAsync
 * @acess public
 */
function _isAsync(fn) {
	if (!fn) {
		const err = new TypeError('"fn" is not defined.');
		throw err;
	}

	return fn.constructor.name === 'AsyncFunction';
}


/**
 *
 * @alias isRegExp
 * @acess public
 */
function _isRegExp(obj) {
	if (!obj) {
		const err = new TypeError('"obj" is not defined.');
		throw err;
	}

	return obj instanceof RegExp;
}


/**
 *
 * @alias isConstructor
 * @acess public
 */
function _isConstructor(fn) {
	try {
		new fn();
	}
	catch (err) {
		return false;
	}

	return true;
}
