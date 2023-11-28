/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';


module.exports = function Enum(constantsList={}) {
	_setGetters(this, constantsList);

	this.withValuePrefix = _withValuePrefix.bind(this);
	this.withKeyPrefix = _withKeyPrefix.bind(this);
}

function _setGetters(enumTarget, constantsList) {
	enumTarget.list = constantsList;

	Object.keys(constantsList).forEach(key => {
		enumTarget[key] = constantsList[key];
	});

	// Set constants in static array.
	enumTarget.asArray = Object.values(constantsList);
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
