
module.exports = Enum;

function Enum(constantsList = {}, writable=false) {
	const def = (key, value) => Object.define(this, key, { value, writable: !!writable });

	// Set list.
	def('list', constantsList);

	// Set getters:
	Object.keys(constantsList)
				.forEach(key => def(key, constantsList[key]) );

	// Set constants in static array.
	def('asArray', Object.values(constantsList) );
}
