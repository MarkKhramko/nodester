const Configs = require('#configs/redis');
const { createClient } = require('redis');

let client = null;


module.exports = {
	init: _init,

	set: _set,
	get: _get,
	delete: _delete
}

async function _init() {
	try {
		client = createClient({ url: Configs.url });
		await client.connect();
		
		return Promise.resolve(client);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

async function _set(branch, key, value, expirationDate=null) {
	try {
		const options = {};

		if (!!expirationDate) {
			options['EX'] =  _dateTimeDifference(expirationDate);
		}

		await client.set( `${ branch }:${ key }`, _stringify(value), options);
		
		return Promise.resolve();
	}
	catch(error) {
		console.error('Redis.set ERROR', error);
		return Promise.reject(error);
	}
}

async function _get(branch, key) {
	try {
		const result = await client.get( `${ branch }:${ key }`);
		return Promise.resolve(result);
	}
	catch(error) {
		console.error('Redis.get ERROR', error);
		return Promise.reject(error);
	}
}

async function _delete(branch, key) {
	try {
		await client.del( `${ branch }:${ key }`);
		
		return Promise.resolve();
	}
	catch(error) {
		console.error('Redis.delete ERROR', error);
		return Promise.reject(error);
	}
}

function _dateTimeDifference(dateTime) {
	const currentTime = new Date();
	// Calculate the difference in milliseconds
	const timeDifference = dateTime.getTime() - currentTime.getTime();

	// Convert milliseconds to seconds
	const expirationTimeSeconds = Math.floor(timeDifference / 1000);

	return expirationTimeSeconds;
}

function _stringify(value) {
	let _value = value;
	
	if (typeof value === 'object') {
		_value = JSON.stringify(value);
	}

	return _value;
}
