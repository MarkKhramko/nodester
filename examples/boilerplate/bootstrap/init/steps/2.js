/*
 * This bootstrap step creates all neccessary project directories.
 */
const Path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;

const nodesterConfig = require(Path.join(process.cwd(), 'nodester.config'));


module.exports = {
	run: _run
}

async function _run() {
	console.info('Step 2 performing...');

	const controllersPath = nodesterConfig.paths.controllers;

	const controllersDirectoryExists = fsSync.existsSync(controllersPath);
	if (!controllersDirectoryExists) {
		await fs.mkdir(controllersPath);
	}
	console.info('✅ controllers directory created');

	console.info('\n');
	return Promise.resolve();
}
