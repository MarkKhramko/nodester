// Import config from .env file.
require('dotenv').config();
// Connection to database
const db = require('#db');


// Seeds:
//	Add all your seeder files here


void (async function start() {
	try {
		// Validation of NODE_ENV.
		const environment = process.env.NODE_ENV;
		if (environment !== 'development') {
			const error = new Error(`Could not migrate in env ${ environment }. Only 'development' is allowed.`);
			throw error;
		}

		//	Call all your seeder files here

		process.exit(0);
	}
	catch(error) {
		console.error('🔺 Seeder error:', error);
		process.exit(1);
	}
})();
