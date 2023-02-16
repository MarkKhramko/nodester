// Utils:
const { lowerCaseFirstLetter } = require('nodester/utils/strings.util');


module.exports = class ServiceFacade {
	constructor(
		nameSingular,
		namePlural,
	) {
		if (!nameSingular || !namePlural) {
			throw new Error('"nameSingular" and "namePlural" arguments must be set.');
		}

		this.nameSingular = lowerCaseFirstLetter(nameSingular);
		this.namePlural = lowerCaseFirstLetter(namePlural);
	}
}
