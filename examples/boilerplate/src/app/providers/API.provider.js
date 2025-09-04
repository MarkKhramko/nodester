const { withFormattedResponse } = require('#factories/responses');


module.exports = function APIProvider() {
	withFormattedResponse(this);

	this.getStatus = _getStatus.bind(this);
}

async function _getStatus (req, res) {
	try {
		const output = {
			operational: true,
			status: 'operational'
		}
		this.respondOk(res, output);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}
