
module.exports = function ConstantsEnum(constantsList = {}) {
	// Set list.
	this.list = constantsList;

	// Set getters.
	Object.keys(constantsList).forEach(key => {
		this[key] = constantsList[key];
	});

	// Set constants in static array.
	this.asArray = Object.values(constantsList);
}
