
module.exports = {
	associateModels: _associateModels
}

async function _associateModels(models) {
	return new Promise((resolve, reject) => {
		try {
			Object.keys(models).map(modelName => (
				models[modelName].associate(models)
			));

			return resolve(models);
		}
		catch(error) {
			reject(error);
		}
	});
}
