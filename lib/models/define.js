/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

// CRUD mixins.
const { implementsCRUD } = require('./mixins');
// ORM.
const { DataTypes } = require('sequelize');


module.exports = defineModel;

/*
 * @param {SequilizeConnection} databaseConnection
 * @param {String} modelName
 * @param {Function} definition
 * @param {Object} options
 *   - ... Sequilize model options
 *   - noCRUD (Bool)
 */
function defineModel(
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

		// Configs related to nodester:
		nodester: {
			output: 'underscored'
		},

		// Add user-defined options (they can override upper ones).
		...options
	};

	const model = databaseConnection.define(modelName, definitionObject, _options);

	if (options.noCRUD !== true) {
		// Add:
		// - createWithIncludes;
		// - findById;
		// - updateById;
		// - deleteById;
		// - etc.
		implementsCRUD(model);
	}

	// Associations:
	model.associate = (models) => {};
	model.getIncludesList = _getIncludesList.bind(model);

	// Instance methods:
	model.prototype.toJSON = function() {
		const values = { ...this.get() };
		return values;
	}

	return model;
}

/* Association mixins: */
function _getIncludesList(facadeData=null) {
	const result = [];

	const associations = this.associations;
	const associationEntries = Object.entries(associations);

	associationEntries.forEach(([
		associationName,
		associationDefinition
	]) => {
		const a = { association: associationName };

		if (!!facadeData) {
			// If facade data is set, go deeper:
			const keys = Object.keys( facadeData );
			if (keys.indexOf(associationName) > 0) {
				const associationModel = associationDefinition.target;

				const a = { association: associationName };
				if (Object.entries(associationModel.associations).length > 0) {
					const deepData = facadeData[ associationName ];
					a.include = associationModel.getIncludesList(Array.isArray(deepData) ? deepData[0] : deepData);
				}

				result.push( a );
			}
		}
		else {
			result.push( a );
		}
	});

	return result;
}
/* Association mixins\ */
