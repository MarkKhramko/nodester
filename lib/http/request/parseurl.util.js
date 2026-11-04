'use strict';

const { Url } = require('url');


module.exports = parseUrl;

/**
 * Parse a request URL and cache the result on the request, matching the
 * subset of `parseurl` used by Nodester.
 *
 * @param {IncomingMessage} request
 * @return {Url}
 */
function parseUrl(request) {
	const raw = request.url;

	if (raw === undefined) {
		return undefined;
	}

	const parsed = request._parsedUrl;
	if (isFresh(raw, parsed)) {
		return parsed;
	}

	const result = fastParse(raw);
	if (result) {
		result._raw = raw;
	}

	request._parsedUrl = result;
	return result;
}

function isFresh(raw, parsed) {
	return parsed !== null && typeof parsed === 'object' &&
		(parsed._raw === raw ||
			(parsed._raw === undefined && parsed.href === raw));
}

function fastParse(raw) {
	if (typeof raw !== 'string' || raw.length === 0) {
		return null;
	}

	const questionMark = raw.indexOf('?');
	const pathname = questionMark === -1
		? raw
		: raw.substring(0, questionMark);
	const parsed = new Url();

	parsed.path = raw;
	parsed.href = raw;
	parsed.pathname = pathname;

	if (questionMark !== -1) {
		parsed.search = raw.substring(questionMark);
		parsed.query = raw.substring(questionMark + 1);
	}

	return parsed;
}
