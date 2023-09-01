
module.exports = {
	parseProviderFileNames: _parseProviderFileNames
}

function _parseProviderFileNames(fileNames, availableFileExtensions, term='controller') {
	const resultNames = [];

	for (const fileName of fileNames) {

		const nameParts = fileName.split('.');
		const extension = nameParts.pop();
		if (availableFileExtensions.indexOf(extension) === -1) {
			continue;
		}

		// If the name format is <model>.<term>,
		// but second part is not "term":
		if (nameParts.length > 1 && nameParts[1] !== term)
			continue;

		const result = {
			fileName: fileName,
			[`${ term }Name`]: nameParts[0]
		}
		resultNames.push(result);
	}

	return resultNames;
}
