/*!
 * /nodester
 * MIT Licensed
 */
'use strict';


module.exports = {
	isModel: _isModel
};

function _isModel(arg=null) {
	return !!arg.tableName && typeof arg._schema === 'object';
}
