require(process.cwd() + '/alias.config');

// Import config from .env file.
require('#configs/environments');

const step1 = require('./steps/1');
const step2 = require('./steps/2');
const step3 = require('./steps/3');


void (async function start() {
	try {
		console.info('Bootstrapping this project...\n');
		await step1.run();
		await step2.run();
		await step3.run();

		console.info('✅ Project is ready!');
		process.exit(0);
	}
	catch(error) {
		console.error('🔺 Seeder error:', error);
		process.exit(1);
	}
})();
