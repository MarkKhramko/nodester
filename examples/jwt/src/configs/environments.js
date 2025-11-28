require('dotenv').config();


module.exports = {
	CURRENT: process.env.NODE_ENV,
	ALLOWED: [
		'development',
		'testing',
		'staging',
		'production',
	],
}
