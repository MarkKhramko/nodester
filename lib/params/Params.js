
module.exports = Params;

/**
 * Extracts only values in second argument
 * from first argument.
 * If such values is missing in first atgument,
 * will fallback to the value in second argument.
 *
 * @param {Object} sourceObj
 * @param {Object} defaultValuesList
 *
 * @return {Object} result
 *
 * @api public
 */
function Params(
	sourceObj={},
	defaultValuesList={}
) {
	const result = {};

	const keys = Object.keys(defaultValuesList);
	for (const key of keys) {

		// If value is not set,
		// use default one from 'defaultValuesList':
		if (sourceObj[key] === undefined) {
			result[key] = defaultValuesList[key];
			continue;
		}

		result[key] = sourceObj[key];
	}

	return result;
}
