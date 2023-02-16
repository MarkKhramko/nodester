// Sequelize.
const { QueryTypes } = require('sequelize');

// Utils:
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);


module.exports = {
	parseSQLFileContents: _parseSQLFileContents,

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

function _rawUpdate(db, tableName, where, data) {
	const dataKeys = Object.keys(data);

	let sqlAttributes = '';

	for (let i=0; i < dataKeys.length; i++) {
		const key = dataKeys[i];
		const val = data[key];

		sqlAttributes += `${ key }='${ val }'`;

		if (i < dataKeys.length-1) {
			sqlAttributes += ', ';
		}
	}

	const sql = `UPDATE \`${ tableName }\` SET ${ sqlAttributes } where ${ where };`;

	return db.query(sql, {
		type: QueryTypes.INSERT
	});
}

function _rawInsert(db, tableName, data) {
	const dataKeys = Object.keys(data);
	const dataValues = Object.values(data);
	
	let values = '';
	for (let i=0; i < dataValues.length-1; i++) {
		const val = dataValues[i];

		if (val === undefined || val === null)
			values += 'null, ';
		else if (typeof val === 'object')
			values += `'${ JSON.stringify(val) }', `;
			// values += `'{}', `;
		else
			values += `'${val}', `;
	}
	values += `'${ dataValues[dataValues.length-1] }'`;

	const sql = `INSERT INTO \`${ tableName }\` (${ dataKeys.join(', ') }) VALUES (${ values });`;

	return db.query(sql, {
		type: QueryTypes.INSERT
	});
}
