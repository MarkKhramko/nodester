const CONFIGS = require('#configs/redis');
const { createClient } = require('redis');

const {
	dateTimeToTTL,
	stringify
} = require('./utils');


let client = null;


module.exports = {
	init: _init,

	set: _set,
	get: _get,
	delete: _delete
}

/**
 * Initialize the Redis client (singleton).
 *
 * @returns {Promise<import("redis").RedisClientType>} The connected Redis client.
 */
async function _init() {
	if (client && client.isOpen)
		return client;

	try {
		client = createClient({
			url: CONFIGS.URL,
			socket: {
				reconnectStrategy: (retries) => {
					if (retries > 20) {
						const err = new Error('Redis unavailable');
						err.details = `Number of reconnection attempts: ${ retries }`;
						return err;
					}
					// Exponential backoff up to 3 seconds
					return Math.min(retries * 100, 3000);
				}
			}
		});

		client.on('error', err => {
			console.error('[Redis] Client error:', err);
		});

		await client.connect();
		return client;
	}
	catch(error) {
		console.error('[Redis] Init failed:', error);
		throw error;
	}
}

/**
 * Set a Redis key with optional expiration date.
 *
 * @param {string} branch - Namespace or logical grouping for the key.
 * @param {string} key - The key name within the branch.
 * @param {*} value - Any value; objects will be auto-stringified.
 * @param {Date|null} [expirationDate=null] - Optional expiration date.
 * @returns {Promise<void>}
 */
async function _set(branch, key, value, expirationDate=null) {
	try {
		_ensureClientReady();

		const options = {};

		if (expirationDate instanceof Date) {
			const ttl = dateTimeToTTL(expirationDate);
			if (ttl > 0)
				options.EX = ttl;
		}

		await client.set(`${branch}:${key}`, stringify(value), options);
	}
	catch(error) {
		console.error('Redis.set error', error);
		throw error;
	}
}

/**
 * Get a Redis key.
 *
 * @param {string} branch - Namespace or logical grouping.
 * @param {string} key - The key name.
 * @returns {Promise<string|null>} The stored string value or null.
 */
async function _get(branch, key) {
	try {
		_ensureClientReady();

		return await client.get(`${branch}:${key}`);
	}
	catch(error) {
		console.error('Redis.get error', error);
		throw error;
	}
}

/**
 * Delete a Redis key.
 *
 * @param {string} branch - Namespace or logical grouping.
 * @param {string} key - The key name.
 * @returns {Promise<void>}
 */
async function _delete(branch, key) {
	try {
		_ensureClientReady();
		await client.del(`${branch}:${key}`);
	}
	catch(error) {
		console.error('Redis.delete error', error);
		throw error;
	}
}

/**
 * Ensure redis client is connected before performing operations.
 */
function _ensureClientReady() {
	if (!client || !client.isOpen) {
		throw new Error('Redis client is not initialized. Call init() first.');
	}
}
