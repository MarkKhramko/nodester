
module.exports = async function associateModels(databaseConnection) {
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
