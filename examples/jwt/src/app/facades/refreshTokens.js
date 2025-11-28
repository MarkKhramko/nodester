const {
	withDefaultCRUD
} = require('nodester/facades/mixins');

// Model.
const refreshToken = require('#models/RefreshToken');


module.exports = function RefreshTokensFacade() {
	withDefaultCRUD(this, {
		model: refreshToken
	});
}
