const {
	withDefaultCRUD,
	withDefaultErrorProcessing
} = require('nodester/controllers/mixins');

const usersFacade = require('#facades/users');


module.exports = function UsersController() {
	withDefaultCRUD(this, {
		facade: usersFacade
	});
	withDefaultErrorProcessing(this);
}
