/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const { associateModels } = require('nodester/models/associate');

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');


module.exports = {
	migrate: _migrate
}

async function _migrate(databaseConnection, force=false) {
	try {
		ensure(force, 'boolean', 'force');

		// Test connection.
		await databaseConnection.authenticate();


		const models = databaseConnection.models;
		const modelNames = Object.keys(models);
		
		console.info('Models list:', ...modelNames.map(name => `\n • ${ name }`), '\n');

		console.info('Forcefully?', force);
		console.info('Syncing...\n');

		await associateModels(databaseConnection);
		await databaseConnection.sync({ force });
		console.info('Successful migration!');

		const output = {
			synced: true,
			modelNames: modelNames,
			models: models
		}
		return Promise.resolve(output);
	}
	catch(error) {
		console.error('Migration failed!');
		console.error(error);
		return Promise.reject(error);
	}
}

