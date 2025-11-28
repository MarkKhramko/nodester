/*
 * This bootstrap step creates .env file.
 */
const Path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;


module.exports = {
	run: _run
}

async function _run() {
	console.info('Step 1 performing...');

	const envPath = Path.join(process.cwd(), '.env');

	const envExists = fsSync.existsSync(envPath);
	if (envExists) {
		_logSuccess();
		return Promise.resolve();
	}

	const envExamplePath = Path.join(process.cwd(), '.env.example');

	await fs.copyFile(envExamplePath, envPath);

	_logSuccess();
	return Promise.resolve();
}

function _logSuccess() {
	console.info('✅ .env file created\n');
}