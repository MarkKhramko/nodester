require(process.cwd() + '/alias.config');

// Info about current and allowed environments.
require('#configs/environments');

// Various configs:
const APP_CONFIGS = require('#configs/app');
const SERVER_CONFIGS = require('#configs/server');


// Init.
const nodester = require('nodester');
const app = new nodester({ title: APP_CONFIGS.TITLE });

// Database setup:
const { initDatabaseSync } = require('#db/init');
const dbConnection = initDatabaseSync();

// #routing module is responsible for setting up the application's routes.
const { routeTheApp } = require('#routing');

// Services:
const jwt = require('#services/jwt');
// const Redis = require('#services/redis');


app.beforeStart(async () => {
	await app.set.database(dbConnection);
	console.info('✅ Database connected');

	jwt.verifyKeys();
	console.info('✅ [Auth] JWT keys configured');

	routeTheApp(app);
	console.info('✅ Routes configured');
});


app.listen(SERVER_CONFIGS.PORT, () => {
	console.info('listening on port', parseInt(app.port));
});

// Gracefully shut down:
process.once('SIGTERM', () => {
	app.stop(() => {
		const pid = process.pid;
		console.info('Process', pid, 'terminated\n');
		process.exit(0);
	});
});
