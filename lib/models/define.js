/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

// CRUD mixins.
const { implementsCRUD } = require('./mixins');
// ORM.
const { DataTypes } = require('sequelize');


module.exports = defineModel;

/**
 * @param {SequilizeConnection} databaseConnection
 * @param {string}   modelName
 * @param {Function} definition
 * @param {Object}   [options]
 * ... Sequilize model options
 * @param {Object}   [options.nodester]
 * @param {boolean}  [options.nodester.noCRUD]
 * @param {string}   [options.nodester.output]
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

		// The only way to get snake-cased timestamps:
		// (issue: https://github.com/sequelize/sequelize/issues/10857)
		createdAt: 'created_at',
		updatedAt: 'updated_at',
		deletedAt: 'deleted_at',

		// Configs related to nodester:
		nodester: {
			noCRUD: false,
			output: 'underscored'
		},

		// Add user-defined options
		// (they can fully override upper ones).
		...options
	};

	const model = databaseConnection.define(modelName, definitionObject, _options);

	if (_options.nodester.noCRUD !== true) {
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
	model.getIncludesTree = _getIncludesTree.bind(model);

	// Instance methods:
	model.prototype.toJSON = function() {
		const values = { ...this.get() };
		return values;
	}

	return model;
}

// Associations mixins:
/**
 * @example
 * [
 *    <include_name_0>: {
 *      <subinclude_name_0>: { ... }
 *    },
 *    <include_name_1>: { ... }
 * ]
 * @param {Object|null} data
 *
 * @return {Array} associationsTree
 *
 * @alias getIncludesTree
 */
function _getIncludesTree(data=null) {
	const result = [];

	const associations = this.associations;
	const associationEntries = Object.entries(associations);

	for (const [ associationName, associationDefinition ] of associationEntries) {
		const formatted = { association: associationName };

		if (!!data && typeof data === 'object') {
			// If data (for example during create)
			// is set, go deeper:
			const keys = Object.keys( data );
			if (keys.indexOf(associationName) > 0) {
				const associationModel = associationDefinition.target;

				if (Object.entries(associationModel.associations).length > 0) {
					const deepData = data[ associationName ];
					formatted.include = associationModel.getIncludesTree(
												Array.isArray(deepData) ? deepData[0] : deepData
											);
				}
			}
		}

		result.push( formatted );
	}

	return result;
}
// Associations mixins\
