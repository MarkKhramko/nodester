/**
 * Small DEBUG-compatible logger for Nodester's internal diagnostics.
 */

'use strict';

module.exports = function createDebug(namespace) {
	const enabled = isEnabled(namespace);

	return function debug(...args) {
		if (!enabled) {
			return;
		}

		const message = args.length > 1
			? args.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')
			: String(args[0]);

		process.stderr.write(`${namespace} ${message}\n`);
	};
};

function isEnabled(namespace) {
	const configured = process.env.DEBUG;
	if (!configured) {
		return false;
	}

	return configured.split(/[\s,]+/).some(pattern => {
		if (!pattern) {
			return false;
		}

		const expression = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);
		return expression.test(namespace);
	});
}

function escapeRegExp(value) {
	return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}
