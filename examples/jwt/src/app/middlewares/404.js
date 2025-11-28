const Codes = require('nodester/http/codes');

const { withFormattedResponse } = require('#factories/responses');


module.exports = function NotFound() {
	withFormattedResponse(this);

	this.sendNotFound = _sendNotFound.bind(this);
}

function _sendNotFound(req, res) {
	const err = new Error('Route not found');
	err.status = Codes.NOT_FOUND;
	
	this.respondWithError(res, err);
}
