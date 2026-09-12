/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Utils.
const { underscore, lowerCaseFirstLetter } = require('./strings.util');


module.exports = {
	isModel: _isModel,
	outputNameForModel: _outputNameForModel
};

function _isModel(arg=null) {
	return !!arg.tableName && typeof arg._schema === 'object';
}

/**
 * Derives the model's OUTPUT collection name — the key used for this model
 * in every response payload (and, consequently, the base of its root COUNT
 * alias). Underscored by default, camelCased under `nodester.output: 'camelcased'`.
 *
 * This is the single source of truth for that derivation: both the CRUD
 * facade (which builds the response key) and the COUNT mapper (which builds
 * the `<plural>_count` alias) call it, so the two can never diverge.
 *
 * @param {Model} model — a Sequelize model with `options.name` set.
 *
 * @return {Object} outputName
 * @return {string} outputName.singular
 * @return {string} outputName.plural
 *
 * @alias outputNameForModel
 * @access public
 */
function _outputNameForModel(model) {
	const { name } = model.options;

	switch (model.options?.nodester?.output) {
		case 'camelcased':
			return {
				singular: lowerCaseFirstLetter(name.singular),
				plural: lowerCaseFirstLetter(name.plural)
			};
		case 'underscored':
		default:
			return {
				singular: underscore(name.singular),
				plural: underscore(name.plural)
			};
	}
}
