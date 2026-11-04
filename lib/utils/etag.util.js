/**
 * Generate a strong entity tag for a string or Buffer response body.
 */

'use strict';

const crypto = require('crypto');

module.exports = function calculateEtag(entity) {
	if (typeof entity !== 'string' && !Buffer.isBuffer(entity)) {
		throw new TypeError('argument entity must be string or Buffer');
	}

	const length = typeof entity === 'string' ? Buffer.byteLength(entity, 'utf8') : entity.length;
	const hash = crypto.createHash('sha1').update(entity, 'utf8').digest('base64').substring(0, 27);

	return `"${length.toString(16)}-${hash}"`;
};
