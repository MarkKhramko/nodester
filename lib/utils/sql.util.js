// Sequelize.
const { QueryTypes } = require('sequelize');

// Utils:
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);


module.exports = {
	parseSQLFileContents: _parseSQLFileContents,

	rawSelect: _rawSelect,
	rawUpdate: _rawUpdate,
	rawInsert: _rawInsert
}

async function _parseSQLFileContents(filePath) {
	try {
		const fileContent = await readFile(filePath, 'utf8');
		const sqlCommands = fileContent.toString()
																	 .split('\n')
																	 .filter(command => command !== '');

		const output = { commands: sqlCommands };
		return Promise.resolve(output);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

// Dialect-aware identifier quoting.
// MySQL uses `backticks`, Postgres/others use "double quotes".
// Delegating to the connection's query generator keeps this portable.
function _quoteIdentifier(db, identifier) {
	return db.getQueryInterface().queryGenerator.quoteIdentifier(identifier);
}

function _quoteTable(db, tableName) {
	return db.getQueryInterface().queryGenerator.quoteTable(tableName);
}

// Normalize a value for use as a bound replacement:
// - Sequelize forbids `undefined`, so map it (and null) to null.
// - Dates and Buffers are passed through so Sequelize can escape them
//   correctly for the active dialect.
// - Plain objects/arrays are stringified for JSON/text columns.
function _normalizeValue(val) {
	if (val === undefined || val === null) {
		return null;
	}
	if (val instanceof Date || Buffer.isBuffer(val)) {
		return val;
	}
	if (typeof val === 'object') {
		return JSON.stringify(val);
	}
	return val;
}

function _rawSelect(db, tableName) {
	const sql = `SELECT * FROM ${ _quoteTable(db, tableName) };`;
	return db.query(sql, { type: QueryTypes.SELECT });
}

function _rawUpdate(db, tableName, where, data) {
	const dataKeys = Object.keys(data);

	const replacements = {};
	const assignments = dataKeys.map((key) => {
		replacements[`set_${ key }`] = _normalizeValue(data[key]);
		return `${ _quoteIdentifier(db, key) } = :set_${ key }`;
	});

	const sql = `UPDATE ${ _quoteTable(db, tableName) } SET ${ assignments.join(', ') } WHERE ${ where };`;

	return db.query(sql, {
		type: QueryTypes.UPDATE,
		replacements
	});
}

function _rawInsert(db, tableName, data) {
	const dataKeys = Object.keys(data);

	const replacements = {};
	const columns = dataKeys.map((key) => _quoteIdentifier(db, key));
	const placeholders = dataKeys.map((key) => {
		replacements[key] = _normalizeValue(data[key]);
		return `:${ key }`;
	});

	const sql = `INSERT INTO ${ _quoteTable(db, tableName) } (${ columns.join(', ') }) VALUES (${ placeholders.join(', ') });`;

	return db.query(sql, {
		type: QueryTypes.INSERT,
		replacements
	});
}
