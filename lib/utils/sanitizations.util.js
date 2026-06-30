/**
 * nodester
 * MIT Licensed
 */

'use strict';


module.exports = {
	UUID: _UUID,
	UUIDV1: _UUID,
	UUIDV4: _UUID,

	CHAR: _STRING,
	VARCHAR: _STRING,
	STRING: _STRING,
	TEXT: _TEXT,
	CITEXT: _STRING,
	TSVECTOR: _STRING,

	// Network address types are stored as strings.
	CIDR: _STRING,
	INET: _STRING,
	MACADDR: _STRING,

	ENUM: _ENUM,

	NUMBER: _NUMBER,
	DECIMAL: _NUMBER,

	INT: _INTEGER,
	INTEGER: _INTEGER,
	BIGINT: _INTEGER,
	TINYINT: _INTEGER,
	SMALLINT: _INTEGER,
	MEDIUMINT: _INTEGER,

	FLOAT: _FLOAT,
	REAL: _FLOAT,
	DOUBLE: _FLOAT,

	BOOLEAN: _BOOLEAN,

	DATE: _DATE,
	DATETIME: _DATE,
	NOW: _DATE,
	DATEONLY: _DATEONLY,
	TIME: _TIME,

	JSON: _JSON,
	JSONTYPE: _JSON,
	JSONB: _JSON,
	// Geometry/Geography accept GeoJSON objects, HSTORE accepts key/value objects.
	GEOMETRY: _JSON,
	GEOGRAPHY: _JSON,
	HSTORE: _JSON,

	ARRAY: _ARRAY,
	RANGE: _ARRAY,

	BLOB: _BLOB,

	VIRTUAL: _VIRTUAL
}

function _UUID(value=undefined, options={ fallback:undefined }) {
	try {
		if (typeof value !== 'string')
			throw new Error(`Not a valid UUID`);

		return value;
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

function _TEXT(value=undefined, options={ fallback:undefined }) {
	try {
		if (typeof value !== 'string')
			throw new Error(`Not a String`);

		return value;
	}
	catch(ex) {
		return options?.fallback;
	}
}


function _ENUM(value=undefined, options={ fallback:undefined }) {
	if (value === undefined)
		return options.fallback;

	return value;
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

function _FLOAT(value=undefined, options={ fallback:undefined, min:undefined, max:undefined }) {
	const num = _NUMBER(value, { fallback:undefined, min:options?.min, max:options?.max });
	return num === undefined ? options?.fallback : parseFloat(num);
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


function _DATEONLY(value=undefined, options={ fallback:undefined }) {
	try {
		const type = Object.prototype.toString.call(value);

		switch(type) {
			case('[object Date]'): {
				if (isNaN(value.valueOf()))
					throw new Error('Not a date');

				// Normalize to a date-only string (YYYY-MM-DD).
				return value.toISOString().slice(0, 10);
			}
			case('[object String]'): {
				const check = new Date(value);
				if (isNaN(check.valueOf()))
					throw new Error('Not a date');

				// Normalize to a date-only string (YYYY-MM-DD).
				return check.toISOString().slice(0, 10);
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


function _TIME(value=undefined, options={ fallback:undefined }) {
	try {
		if (typeof value !== 'string')
			throw new Error(`Not a time string`);

		return value;
	}
	catch(ex) {
		return options?.fallback;
	}
}


function _ARRAY(value=undefined, options={ fallback:undefined }) {
	try {
		if (Array.isArray(value))
			return value;

		// Allow a JSON-encoded array string.
		if (typeof value === 'string') {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed))
				return parsed;
		}

		throw new Error(`Not an Array`);
	}
	catch(ex) {
		return options?.fallback;
	}
}


function _BLOB(value=undefined, options={ fallback:undefined }) {
	try {
		if (Buffer.isBuffer(value) || typeof value === 'string')
			return value;

		throw new Error(`Not a Buffer or String`);
	}
	catch(ex) {
		return options?.fallback;
	}
}


function _VIRTUAL(value=undefined, options={ fallback:undefined }) {
	return value === undefined ? options?.fallback : value;
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
