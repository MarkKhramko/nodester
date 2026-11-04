/**
 * Cursor helpers used by the NQL query planner.
 *
 * Nodester deliberately does not choose an application secret. Applications
 * can inject any codec implementing encode(payload) and decode(cursor), or use
 * createHmacCursorCodec(secret) when a small built-in signed codec is useful.
 */
'use strict';

const crypto = require('crypto');

const CURSOR_VERSION = 1;

function base64url(value) {
	return Buffer.from(value).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function fromBase64url(value) {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(normalized + '='.repeat((4 - normalized.length % 4) % 4), 'base64');
}

function createHmacCursorCodec(secret, options = {}) {
	if (typeof secret !== 'string' && !Buffer.isBuffer(secret)) {
		throw new TypeError('A secret is required to create an HMAC cursor codec.');
	}

	const algorithm = options.algorithm ?? 'sha256';
	const sign = (value) => base64url(crypto.createHmac(algorithm, secret).update(value).digest());

	return Object.freeze({
		encode(payload) {
			const body = base64url(JSON.stringify(payload));
			return `${body}.${sign(body)}`;
		},
		decode(cursor) {
			if (typeof cursor !== 'string') {
				throw new Error('Cursor must be a string.');
			}

			const parts = cursor.split('.');
			if (parts.length !== 2 || !parts[0] || !parts[1]) {
				throw new Error('Malformed cursor.');
			}

			const expected = Buffer.from(sign(parts[0]));
			const actual = Buffer.from(parts[1]);
			if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
				throw new Error('Cursor signature is invalid.');
			}

			let payload;
			try {
				payload = JSON.parse(fromBase64url(parts[0]).toString('utf8'));
			}
			catch (error) {
				throw new Error('Cursor payload is malformed.');
			}

			return payload;
		}
	});
}

function assertCursorCodec(codec) {
	if (!codec || typeof codec.encode !== 'function' || typeof codec.decode !== 'function') {
		throw new TypeError("Cursor pagination requires a codec with 'encode' and 'decode' functions.");
	}
	return codec;
}

module.exports = {
	CURSOR_VERSION,
	createHmacCursorCodec,
	assertCursorCodec,
};
