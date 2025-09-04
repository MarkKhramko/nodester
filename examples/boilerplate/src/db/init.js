// nodester:
const { associateModelsSync } = require('nodester/models/associate');
// Database:
const connection = require('#db');
// Include all application models.
require('#models');


module.exports = {
	initDatabaseSync: _initDatabaseSync
}

function _initDatabaseSync() {
	associateModelsSync(connection);
	return connection;
}