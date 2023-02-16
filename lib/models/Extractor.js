/*
 * ModelDataExtractor (/models/Extractor.js)
 * Reads data from Express's request and filters it,
 * based on model parameters and always-present query parameters (limit, skip, etc.).
 */
// Constants:
const { DataTypes } = require('sequelize');
const IGNORED_KEYS = [
	// Sequilize keys:
	'createdAt',
	'updatedAt',
	'deletedAt',

	'created_at',
	'updated_at',
	'deleted_at',
	// Procedural keys.
	'should_delete',
];
const PROCEDURAL_KEYS = {
	'should_delete': new DataTypes.BOOLEAN()
};
// Utils:
const sntz = require('nodester/utils/sanitizations.util');
const Params = require('nodester/facades/FacadeParams');


module.exports = class ModelDataExtractor {

	constructor(
		modelDefinition,
		options,
	) {
		if (!modelDefinition) {
			throw new Error('"modelDefinition" attribute is invalid.');
		}

		const {
			withFiles
		} = Params(options, {
			withFiles: false
		});

		this.model = modelDefinition;
		this.attributes = modelDefinition.tableAttributes;
		this.options = {
			withFiles: !!withFiles,
			fileInstanceName: 'file',
			filesArrayName: 'files',
		};
	}

	extractData(
		modelDefinition,
		parentModelDefinition=null,
		holder={},
		includes=[],
		skipIdValidation=false,
		skipValidation=false,
	) {
		if (!modelDefinition) {
			const err = new Error('"modelDefinition" attribute is invalid.');
			err.name = 'InternalValidationError';
			throw err;
		}

		const data = {};
		const errors = {};

		const attributes = modelDefinition.tableAttributes;

		// Table attributes minus "special" keys.
		const keysToCheck = Object.keys(attributes)
												.filter(key => !IGNORED_KEYS.includes(key));

		keysToCheck.forEach((key) => {
			const {
				type,
				allowNull,
				defaultValue,
				primaryKey,
				references
			} = attributes[key];

			// Extract raw value from passed object.
			const dataValue = holder[key];

			if (!!primaryKey && !!skipIdValidation) {
				// Just put id to data object:
				if (!!dataValue)
					data[key] = dataValue;

				// Skip further validation.
				return;
			}

			// If this field references some other model:
			if (!!references) {
				const modelReferenced = references.model;

				// If referenced model is the same as parentModel,
				// skip (Sequilize will handle it):
				if (modelReferenced === parentModelDefinition?.tableName) {
					// Skip further validation.
					return;
				}
			}

			// If value is undefined, and null is allowed skip:
			if (dataValue === undefined && allowNull) {
				// Skip further validation.
				return;
			}

			// If value is undefined, and null is allowed,
			// set and skip:
			if (dataValue === null && allowNull) {
				data[key] = null;
				// Skip further validation.
				return;
			}

			if (allowNull === false && (dataValue === undefined || dataValue === null)) {

				// If default value can be set,
				// or we're allowed to skip validation,
				// skip:
				if (defaultValue !== undefined || (!primaryKey && skipValidation === true)) {
					// Skip further validation.
					return;
				}

				return errors[key] = { message: `Field "${key}" can not be null.` };
			}

			data[key] = _sanitizeValue(dataValue, type);
		});

		// Check procedural keys:
		for (const [ key, dataType ] of Object.entries(PROCEDURAL_KEYS)) {
			// Extract raw value from passed object.
			const dataValue = holder[key];

			// If value is defined:
			if (dataValue !== undefined) {
				data[key] = _sanitizeValue(dataValue, dataType);
			}
		};

		// If model has associations:
		if (Object.keys(modelDefinition?.associations)?.length > 0) {
			
			// Go through association entries:
			const associationEntries = Object.entries( modelDefinition.associations );
			associationEntries.forEach(([
				associationName,
				associationDefinition
			]) => {

				// If data of this association is present:
				if (!!holder[associationName]) {
					
					const associatedModel = associationDefinition.target;

					const isSingleInstance = Array.isArray( holder[associationName] ) === false;

					// If single instance of associated model:
					if (isSingleInstance) {
						data[associationName] = this.extractData(
																			associatedModel,
																			modelDefinition,
																			holder[associationName],
																			[], // Includes
																			skipIdValidation,
																			skipValidation
																		);
					}
					// If multiple instances of associated model:
					else {
						data[associationName] = holder[associationName].map((associationData) => {
							return this.extractData(
								associatedModel,
								modelDefinition,
								associationData,
								[], // Includes
								skipIdValidation,
								skipValidation
							);
						});
					}
				}
			});
		}

		// If options for "withFiles" is true,
		// also check files in object.
		if (this.options.withFiles === true) {
			// Check for single file & array of files.
			const keysToCheck = [
				this.options.fileInstanceName,
				this.options.filesArrayName,
			];

			keysToCheck.filter(key => holder[key] !== undefined)
								 .forEach(key => data[key] = holder[key]);
		}

		// If errors were set, throw ValidationError:
		if (Object.keys(errors).length > 0) {
			const err = new Error('');
			err.name = 'ValidationError';
			err.details = { ...errors };
			throw err;
		}
		
		return data;
	}

	extractInstanceDataFromObject(
		holder={},
		includes,
		options,
	) {
		const {
			skipIdValidation,
			skipValidation
		} = Params(options, {
			skipIdValidation: false,
			skipValidation: false,
		});

		return this.extractData(
			this.model,
			null,
			holder,
			includes,
			skipIdValidation,
			skipValidation
		);
	}

	/* ! Warning !
	 * Not finished method
	 * Do not use!
	 */
	extractArrayDataFromObject(
		holder={},
		includes,
		options,
	) {
		const {
			skipIdValidation,
			skipValidation
		} = Params(options, {
			skipIdValidation: false,
			skipValidation: false,
		});

		const { instances } = holder;

		// All model instances must be in an array by key "instances".
		// If "instances" is not array, throw error:
		if (Array.isArray(instances) === false) {
			const err = new Error('');
			err.name = 'ValidationError';
			err.details = { message: 'Field "instances" must be an array' };
			throw err;
		}

		const results = instances.map((instance) => 
			this.extractData(
				this.model,
				null,
				instance,
				skipIdValidation,
				skipValidation
			)
		);

		return results;
	}
}

function _sanitizeValue(
	value,
	dataType,
	fallback=null,
) {
	let result = null;

	if (dataType instanceof DataTypes.INTEGER) {
		result = sntz.INT(value, { fallback });
	}
	else if (dataType instanceof DataTypes.DECIMAL) {
		result = sntz.NUMBER(value, { fallback });
	}
	else if (dataType instanceof DataTypes.FLOAT) {
		result = sntz.NUMBER(value, { fallback });
	}
	else if (dataType instanceof DataTypes.STRING) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.TEXT) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.ENUM) {
		result = sntz.STRING(value, { fallback });
	}
	else if (dataType instanceof DataTypes.JSON) {
		result = sntz.JSON(value, { fallback });
	}
	else if (dataType instanceof DataTypes.BOOLEAN) {
		result = sntz.BOOLEAN(value, { fallback });
	}
	else if (dataType instanceof DataTypes.DATE || dataType instanceof DataTypes.DATEONLY) {
		result = sntz.DATE(value, { fallback });
	}

	return result;
}
