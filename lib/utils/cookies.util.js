/**
 * Parse the Cookie request header.
 *
 * Nodester only needs request-cookie parsing. Keeping this small avoids
 * shipping the serializer and Set-Cookie implementation as well.
 */

'use strict';

module.exports = {
	parse: _parse
};

function _parse(header) {
	const cookies = Object.create(null);

	if (typeof header !== 'string' || header.length < 2) {
		return cookies;
	}

	for (const pair of header.split(';')) {
		const separator = pair.indexOf('=');
		if (separator < 0) {
			continue;
		}

		const name = pair.slice(0, separator).trim();
		if (!name || cookies[name] !== undefined) {
			continue;
		}

		const value = pair.slice(separator + 1).trim();
		const unquoted = value.charCodeAt(0) === 0x22 && value.charCodeAt(value.length - 1) === 0x22
			? value.slice(1, -1)
			: value;

		cookies[name] = decodeURIComponent(unquoted);
	}

	return cookies;
}
