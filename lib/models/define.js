// CRUD mixins.
const { implementsCRUD } = require('./mixins');
// ORM.
const { DataTypes } = require('sequelize');

// Utils.
// const {
// 	pluralize,
// 	underscore
// } = require('../utils/strings.util');


module.exports = _defineModel;

/*
 * params:
 * - databaseConnection (Instance of Sequilize)
 * - modelName (String)
 * - definition (function)
 * - options (Object)
 *   - ... Sequilize model options
 *   - noCRUD (Bool)
 */
function _defineModel(
	databaseConnection,
	modelName='',
	definition=()=>{},
	options={}
) {
	const definitionObject = definition( DataTypes );
	const _options = {
		// Set snake-cased table name.
		// tableName: underscore( pluralize(modelName) ),
		// Set snake-case.
		underscored: true,
		// Enable automatic 'created_at' and 'updated_at' fields.
		timestamps: true,

		// The only way to get snake-cased timestamps (issue: https://github.com/sequelize/sequelize/issues/10857)
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		deletedAt: 'deleted_at',

		// Add user-defined options (they can override upper ones).
		...options
	};
	const model = databaseConnection.define(modelName, definitionObject, _options);

	if (options.noCRUD !== true) {
		// Add createWithIncludes, findById, updateById, deleteById, etc.
		implementsCRUD(model);
	}

	// Instance methods:
	model.prototype.toJSON = function() {
		const values = { ...this.get() };
		return values;
	}
	// Instance methods\

	return model;
}
