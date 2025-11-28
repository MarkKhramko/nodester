const Enum = require('nodester/enum');

const auth = require('./auth');
const visitor = require('./visitor');


module.exports = new Enum({
	auth,
	visitor
});
