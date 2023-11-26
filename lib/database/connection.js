/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

// ORM.
const Sequelize = require('sequelize');


module.exports = {
	buildConnection: _buildConnection
};

function _buildConnection(opts={}) {
	

	const dbName = opts.name;
	const username = opts.username;
	const password = opts.password;


	const connection = new Sequelize(
		dbName,
		username,
		password,
		{
			host: opts.host,
			port: opts.port,
			dialect: opts.dialect,
			pool: opts.pool,
			charset: opts.charset,
			collate: opts.collate, 
			timestamps: opts.timestamps,
			logging: opts.logging
		}
	);

	return connection;
}
