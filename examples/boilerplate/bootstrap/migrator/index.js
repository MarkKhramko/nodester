require(process.cwd() + '/alias.config');
// Import config from .env file.
require('dotenv').config();

// Models to migrate.
require('./models');

// Connection to database
const db = require('#db');

// Utils:
const { migrate } = require('nodester/database/migration');
const { parseSQLFileContents } = require('nodester/utils/sql');


void (async function start() {
	try {
		// Validation of NODE_ENV.
		const environment = process.env.NODE_ENV;
		if (environment !== 'development') {
			const error = new Error(`Could not migrate in env ${ environment }. Only 'development' is allowed.`);
			throw error;
		}

		// Extract terminal params:
		const args = process.argv;

		// "force" is 3rd argument.
		// (Set 'force' to true if you want to rewrite database.)
		const force = (args[2] === 'true' || args[2] === '1');
		
		await migrate(db, force);
		console.info('✅ All models migrated!','\n');

		console.info('Running additional SQL commands...');
		
		const { commands } = await parseSQLFileContents(`${ __dirname }/sql/after_migration.sql`);
		for (let i=0; i < commands.length; i++) {
			const command = commands[i];
			await db.query(command);
		}

		console.info('✅ Database is ready!', '\n');

		process.exit(0);
	}
	catch(error) {
		console.error('🔺 Migrator error:', error);
		process.exit(1);
	}
})();
