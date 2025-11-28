// Info about current and allowed environments.
const environments = require('#configs/environments');


module.exports = {
	log: _log,
	error: _error,
}

/**
 * Log only in development environment.
 */
function _log(...args) {
	if (_isDev()) {
		console.log(...args)
	}
}

/**
 * Error-log only in development environment.
 */
function _error(...args) {
	if (_isDev()) {
		console.error(...args)
	}
}

function _isDev() {
	return environments.current === 'development';
}
