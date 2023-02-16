// Utils.
const inflection = require('inflection');


module.exports = {
	lowerCase: _lowerCase,
	lowerCaseFirstLetter: _lowerCaseFirstLetter,
	
	splitByComma: _splitByComma,
	splitByDot: _splitByDot,
	splitByAmpersand: _splitByAmpersand,

	pluralize: _pluralize,
	underscore: _underscore,
}

function _lowerCase(string='') {
	return string.toLowerCase();
}

function _lowerCaseFirstLetter(string='') {
	return string.charAt(0).toLowerCase() + string.slice(1);
}

function _splitByComma(string='') {
	return string.split(',');
}

function _splitByDot(string='') {
	return string.split('.');
}

function _splitByAmpersand(string='') {
	return string.split('&');
}

function _pluralize(string='') {
	return inflection.pluralize(string);
}

function _underscore(string='') {
	return inflection.underscore(string);
}
