const {
	withDefaultCRUD,
	withDefaultErrorProcessing
} = require('nodester/controllers/mixins');

const refreshTokensFacade = require('#facades/refreshTokens');


module.exports = function RefreshTokensController() {
	withDefaultCRUD(this, {
		facade: refreshTokensFacade
	});
	withDefaultErrorProcessing(this);
}
