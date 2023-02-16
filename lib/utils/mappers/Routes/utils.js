
module.exports = {
	isConstructor: _isConstructor,
	splitByLastDot: _splitByLastDot,
}

function _isConstructor(functionOrClass) {
	try {
		new functionOrClass();
	} catch (err) {
		return false;
	}

	return true;
};

function _splitByLastDot(str) {
	const index = str.lastIndexOf('.');
	return [str.slice(0, index), str.slice(index + 1)];
};
