/**
 * nodester
 * MIT Licensed
 */
 
'use strict';


/**
 * @class
 * @classdesc Convinient structure to describe a set of constants.
 * 
 * @param {Object} constantsList
 */
module.exports = function Enum(constantsList={}) {
	_setGetters(this, constantsList);

	this.withValuePrefix = _withValuePrefix.bind(this);
	this.withKeyPrefix = _withKeyPrefix.bind(this);
}

function _setGetters(enumTarget, constantsList) {
	const frozenList = Object.freeze({ ...constantsList });
	enumTarget.list = frozenList;

	Object.keys(frozenList).forEach(key => {
		enumTarget[key] = frozenList[key];
	});

	// Set constants in static array.
	enumTarget.asArray = Object.freeze(Object.values(frozenList));
}


function _withValuePrefix(prefix='') {
	const constantsList = {};

	for (const [ key, value ] of Object.entries(this.list)) {
		constantsList[key] = `${ prefix }${ value }`;
	}

	_setGetters(this, constantsList);

	return this;
}

function _withKeyPrefix(prefix='') {
	Object.keys(this.list).forEach(key => {
		this[`${ prefix }${ key }`] = this.list[key];
	});

	return this;
}
