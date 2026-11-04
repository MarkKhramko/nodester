/**
 * Check whether a response is fresh according to conditional request headers.
 */

'use strict';

const NO_CACHE = /(?:^|,)\s*?no-cache\s*?(?:,|$)/;

module.exports = _fresh;

function _fresh(requestHeaders, responseHeaders) {
	const modifiedSince = requestHeaders['if-modified-since'];
	const noneMatch = requestHeaders['if-none-match'];

	if (!modifiedSince && !noneMatch) {
		return false;
	}

	if (requestHeaders['cache-control'] && NO_CACHE.test(requestHeaders['cache-control'])) {
		return false;
	}

	if (noneMatch && noneMatch !== '*') {
		const etag = responseHeaders.etag;
		if (!etag) {
			return false;
		}

		const matches = noneMatch.split(',').map(token => token.trim());
		if (!matches.some(match => match === etag || match === `W/${etag}` || `W/${match}` === etag)) {
			return false;
		}
	}

	if (modifiedSince) {
		const lastModified = responseHeaders['last-modified'];
		if (!lastModified || !(Date.parse(lastModified) <= Date.parse(modifiedSince))) {
			return false;
		}
	}

	return true;
}
