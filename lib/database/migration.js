const { associateModels } = require('./utils');


module.exports = {
	migrate: _migrate
}

async function _migrate(databaseConnection, force=false) {
	try {
		// Validation of 'force' parameter.
		if (typeof force !== 'boolean') {
			const err = new Error('Wrong "force" parameter; must be boolean.');
			throw err;
		}

		// Test connection.
		await databaseConnection.authenticate();


		const models = databaseConnection.models;
		const modelNames = Object.keys(models);
		console.info('Models to sync:', modelNames);
		console.info('Forcefully?', force);
		console.info('Syncing...\n');
		await associateModels(models);
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

