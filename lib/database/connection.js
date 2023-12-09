/**
 * nodester
 * MIT Licensed
 */

'use strict';

// The one and only!
const Sequelize = require('sequelize');


module.exports = {
	buildConnection: _buildConnection
};

/**
 * @param {object}   [options={}] An object with options.
 * @param {string}   [options.name] The name of the database
 * @param {string}   [options.username=null] The username which is used to authenticate against the database.
 * @param {string}   [options.password=null] The password which is used to authenticate against the database. Supports SQLCipher encryption for SQLite.
 * @param {string}   [options.host='localhost'] The host of the relational database.
 * @param {number}   [options.port] The port of the relational database.
 * @param {string}   [options.username=null] The username which is used to authenticate against the database.
 * @param {string}   [options.password=null] The password which is used to authenticate against the database.
 * @param {string}   [options.database=null] The name of the database.
 * @param {string}   [options.dialect] The dialect of the database you are connecting to. One of mysql, postgres, sqlite, db2, mariadb and mssql.
 * @param {string}   [options.dialectModule=null] If specified, use this dialect library. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify 'require("pg.js")' here
 * @param {string}   [options.dialectModulePath=null] If specified, load the dialect library from this path. For example, if you want to use pg.js instead of pg when connecting to a pg database, you should specify '/path/to/pg.js' here
 * @param {object}   [options.dialectOptions] An object of additional options, which are passed directly to the connection library
 * @param {string}   [options.storage] Only used by sqlite. Defaults to ':memory:'
 * @param {string}   [options.protocol='tcp'] The protocol of the relational database.
 * @param {object}   [options.define={}] Default options for model definitions. See {@link Model.init}.
 * @param {object}   [options.query={}] Default options for sequelize.query
 * @param {string}   [options.schema=null] A schema to use
 * @param {object}   [options.set={}] Default options for sequelize.set
 * @param {object}   [options.sync={}] Default options for sequelize.sync
 * @param {string}   [options.timezone='+00:00'] The timezone used when converting a date from the database into a JavaScript date. The timezone is also used to SET TIMEZONE when connecting to the server, to ensure that the result of NOW, CURRENT_TIMESTAMP and other time related functions have in the right timezone. For best cross platform performance use the format +/-HH:MM. Will also accept string versions of timezones supported by Intl.Locale (e.g. 'America/Los_Angeles'); this is useful to capture daylight savings time changes.
 * @param {boolean}  [options.keepDefaultTimezone=false] A flag that defines if the default timezone is used to convert dates from the database.
 * @param {number|null} [options.defaultTimestampPrecision] The precision for the `createdAt`/`updatedAt`/`deletedAt` DATETIME columns that Sequelize adds to models. Can be a number between 0 and 6, or null to use the default precision of the database. Defaults to 6.
 * @param {string|boolean} [options.clientMinMessages='warning'] (Deprecated) The PostgreSQL `client_min_messages` session parameter. Set to `false` to not override the database's default.
 * @param {boolean}  [options.standardConformingStrings=true] The PostgreSQL `standard_conforming_strings` session parameter. Set to `false` to not set the option. WARNING: Setting this to false may expose vulnerabilities and is not recommended!
 * @param {Function} [options.logging=console.log] A function that gets executed every time Sequelize would log something. Function may receive multiple parameters but only first one is printed by `console.log`. To print all values use `(...msg) => console.log(msg)`
 * @param {boolean}  [options.benchmark=false] Pass query execution time in milliseconds as second argument to logging function (options.logging).
 * @param {string}   [options.queryLabel] A label to annotate queries in log output.
 * @param {boolean}  [options.omitNull=false] A flag that defines if null values should be passed as values to CREATE/UPDATE SQL queries or not.
 * @param {boolean}  [options.native=false] A flag that defines if native library shall be used or not. Currently only has an effect for postgres
 * @param {boolean}  [options.ssl=undefined] A flag that defines if connection should be over ssl or not
 * @param {boolean}  [options.replication=false] Use read / write replication. To enable replication, pass an object, with two properties, read and write. Write should be an object (a single server for handling writes), and read an array of object (several servers to handle reads). Each read/write server can have the following properties: `host`, `port`, `username`, `password`, `database`.  Connection strings can be used instead of objects.
 * @param {object}   [options.pool] sequelize connection pool configuration
 * @param {number}   [options.pool.max=5] Maximum number of connection in pool
 * @param {number}   [options.pool.min=0] Minimum number of connection in pool
 * @param {number}   [options.pool.idle=10000] The maximum time, in milliseconds, that a connection can be idle before being released.
 * @param {number}   [options.pool.acquire=60000] The maximum time, in milliseconds, that pool will try to get connection before throwing error
 * @param {number}   [options.pool.evict=1000] The time interval, in milliseconds, after which sequelize-pool will remove idle connections.
 * @param {Function} [options.pool.validate] A function that validates a connection. Called with client. The default function checks that client is an object, and that its state is not disconnected
 * @param {number}   [options.pool.maxUses=Infinity] The number of times a connection can be used before discarding it for a replacement, [`used for eventual cluster rebalancing`](https://github.com/sequelize/sequelize-pool).
 * @param {boolean}  [options.quoteIdentifiers=true] Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of them.  WARNING: Setting this to false may expose vulnerabilities and is not recommended!
 * @param {string}   [options.transactionType='DEFERRED'] Set the default transaction type. See `Sequelize.Transaction.TYPES` for possible options. Sqlite only.
 * @param {string}   [options.isolationLevel] Set the default transaction isolation level. See `Sequelize.Transaction.ISOLATION_LEVELS` for possible options.
 * @param {object}   [options.retry] Set of flags that control when a query is automatically retried. Accepts all options for [`retry-as-promised`](https://github.com/mickhansen/retry-as-promised).
 * @param {Array}    [options.retry.match] Only retry a query if the error matches one of these strings.
 * @param {number}   [options.retry.max] How many times a failing query is automatically retried.  Set to 0 to disable retrying on SQL_BUSY error.
 * @param {number}   [options.retry.timeout] Maximum duration, in milliseconds, to retry until an error is thrown.
 * @param {number}   [options.retry.backoffBase=100] Initial backoff duration, in milliseconds.
 * @param {number}   [options.retry.backoffExponent=1.1] Exponent to increase backoff duration after each retry.
 * @param {Function} [options.retry.report] Function that is executed after each retry, called with a message and the current retry options.
 * @param {string}   [options.retry.name='unknown'] Name used when composing error/reporting messages.
 * @param {boolean}  [options.noTypeValidation=false] Run built-in type validators on insert and update, and select with where clause, e.g. validate that arguments passed to integer fields are integer-like.
 * @param {object}   [options.hooks] An object of global hook functions that are called before and after certain lifecycle events. Global hooks will run after any model-specific hooks defined for the same event (See `Sequelize.Model.init()` for a list).  Additionally, `beforeConnect()`, `afterConnect()`, `beforeDisconnect()`, and `afterDisconnect()` hooks may be defined here.
 * @param {boolean}  [options.minifyAliases=false] A flag that defines if aliases should be minified (mostly useful to avoid Postgres alias character limit of 64)
 * @param {boolean}  [options.logQueryParameters=false] A flag that defines if show bind parameters in log.
 *
 * @return {Sequelize} connection - Connection to the database.
 *
 * @alias buildConnection
 * @access public
 */
function _buildConnection(options={}) {
	
	const dbName = options.name;
	const username = options.username;
	const password = options.password;

	const connection = new Sequelize(
		dbName,
		username,
		password,
		{
			host: options.host,
			port: options.port,
			dialect: options.dialect,
			pool: options.pool,
			charset: options.charset,
			collate: options.collate, 
			timestamps: options.timestamps,
			logging: options.logging
		}
	);

	return connection;
}
