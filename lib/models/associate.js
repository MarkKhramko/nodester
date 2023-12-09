/**
 * nodester
 * MIT Licensed
 */
 
'use strict';


module.exports = {
	associateModels: _associateModels,
	associateModelsSync: _associateModelsSync
}


async function _associateModels(databaseConnection) {
	try {
		const models = databaseConnection.models;

		const modelNames = Object.keys(models);

		for (let modelName of modelNames) {
			await models[modelName].associate(models);
		}

		return Promise.resolve(models);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

function _associateModelsSync(databaseConnection) {
	const models = databaseConnection.models;

	const modelNames = Object.keys(models);

	for (let modelName of modelNames) {
		models[modelName].associate(models);
	}

	return models;
}
