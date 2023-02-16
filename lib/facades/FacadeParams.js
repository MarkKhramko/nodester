const Params = require('nodester/utils/params.util');


module.exports = FacadeParams;

function FacadeParams(
	sourceObject={},
	defaultValuesList={}
) {
	return Params(sourceObject, defaultValuesList);
}
