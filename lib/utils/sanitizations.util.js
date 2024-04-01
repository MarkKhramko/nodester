/**
 * nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	NUMBER: _NUMBER,
	
	INT: _INTEGER,
	INTEGER: _INTEGER,

	BOOLEAN: _BOOLEAN,
	STRING: _STRING,

	DATE: _DATE,

	JSON: _JSON
}

function _isNumber(value) {
	return !isNaN(`${value}`);
}

function _NUMBER(value=undefined, options={ fallback:undefined, min:undefined, max:undefined }) {
	try {
		if (!_isNumber(value))
			throw new Error(`Not a number`);

		if (_isNumber(options?.min) && value < options?.min)
			return options?.min;

		if (_isNumber(options?.max) && value > options?.max)
			return options?.max;

		return value;
	}
	catch(ex) {
		return options?.fallback;
	}
}

function _INTEGER(value=undefined, options={ fallback:undefined, min:undefined, max:undefined }) {
	const num = _NUMBER(value, { fallback:undefined, min:options?.min, max:options?.max });
	return num === undefined ? options?.fallback : parseInt(num);
}

function _BOOLEAN(value=undefined, options={ fallback:undefined }) {
	try {
		// If clear boolean.
		if (value === true || value === false || toString.call(value) === '[object Boolean]')
			return value;

		// If string-boolean.
		if (typeof value === 'string')
			return value === 'true';

		throw new Error(`Not a Boolean`);
	}
	catch(ex) {
		return options?.fallback;
	}
}

function _STRING(value=undefined, options={ fallback:undefined }) {
	try {
		if (typeof value !== 'string')
			throw new Error(`Not a String`);
			
		return value;
	}
	catch(ex) {
		return options?.fallback;
	}
}

function _DATE(value=undefined, options={ fallback:undefined }) {
	try {
		const type = Object.prototype.toString.call(value);

		switch(type) {
			case('[object Date]'): {
				if (isNaN(value.valueOf())){
					throw new Error('Not a date');				
				}
				return value;
			}
			case('[object String]'): {
				const check = new Date(value);
				if (check instanceof Date)
					return value;

				break;
			}
			default:
				break;
		}

		throw new Error('Not a date');
	}
	catch(ex) {
		return options?.fallback;
	}
}

function _JSON(value=undefined, options={ fallback:undefined }) {
	try {
		if (typeof value === 'string')
			return JSON.parse(value);

		if (typeof value !== 'object')
			throw new Error(`Not an object`);
		
		return value;
	}
	catch(ex) {
		return options?.fallback;
	}
}
