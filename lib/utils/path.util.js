/**
 * nodester
 * MIT Licensed
 */

'use strict';

exports = module.exports = {
	isAbsolute: _isAbsolute
}

/**
 * Check if `path` looks absolute.
 *
 * @param {string} path
 *
 * @return {boolean}
 *
 * @alias isAbsolute
 * @access public
 */
function _isAbsolute(path) {
	// Unix:
	if ('/' === path[0])
		return true;

	// Windows:
	if (':' === path[1] && ('\\' === path[2] || '/' === path[2]))
		return true;

	// Microsoft Azure:
	if ('\\\\' === path.substring(0, 2))
		return true;
};
