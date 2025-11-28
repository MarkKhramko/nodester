const {
	withDefaultCRUD
} = require('nodester/facades/mixins');

// Model.
const user = require('#models/User');


module.exports = function UsersFacade() {
	withDefaultCRUD(this, {
		model: user
	});
}
