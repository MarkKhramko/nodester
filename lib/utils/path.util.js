
exports = module.exports = {
	isAbsolute: _isAbsolute
}

/**
 * Check if `path` looks absolute.
 *
 * @param {String} path
 * @return {Boolean}
 * @api private
 * @alias isAbsolute
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
