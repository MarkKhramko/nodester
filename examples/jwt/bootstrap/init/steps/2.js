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

	// ---- Controllers ----
	const controllersPath = nodesterConfig.paths.controllers;

	const controllersDirectoryExists = fsSync.existsSync(controllersPath);
	if (!controllersDirectoryExists) {
		await fs.mkdir(controllersPath);
	}
	console.info('✅ "controllers" directory created\n');


	// ---- Facades ----
	const facadesPath = nodesterConfig.paths.facades;

	const facadesDirectoryExists = fsSync.existsSync(facadesPath);
	if (!facadesDirectoryExists) {
		await fs.mkdir(facadesPath);
	}
	console.info('✅ "facades" directory created\n');


	// ---- filters ----
	const filtersPath = nodesterConfig.paths.filters;

	const filtersDirectoryExists = fsSync.existsSync(filtersPath);
	if (!filtersDirectoryExists) {
		await fs.mkdir(filtersPath);
	}
	console.info('✅ "filters" directory created\n');


	console.info('\n');
	return Promise.resolve();
}
