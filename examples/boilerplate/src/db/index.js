const Credentials = require('./credentials');

const { buildConnection } = require('nodester/database/connection');


// Make first database connection.
const connection = buildConnection({
	name: Credentials.database,
	username: Credentials.username,
	password: Credentials.password,

	host: Credentials.host,
	port: Credentials.port,
	dialect: Credentials.dialect,
	pool: Credentials.pool,
	charset: Credentials.charset,
	collate: Credentials.collate, 
	timestamps: Credentials.timestamps,

	logging: Credentials.logging
});

module.exports = connection;
