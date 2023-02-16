
module.exports = Params;

function Params(
	sourceObject={},
	defaultValuesList={}
) {
	const result = {};

	const keys = Object.keys(defaultValuesList);
	for (const key of keys) {
		result[key] = typeof sourceObject[key] !== 'boolean' && !sourceObject[key] ?
										defaultValuesList[key]
										:
										sourceObject[key];
	}

	return result;
}
