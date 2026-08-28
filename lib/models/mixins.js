/**
 * nodester
 * MIT Licensed
 */

'use strict';

/**
 *	CRUD mixins for any model:
 */

// Utils:
const {
	modelHasAssociations,
	getModelAssociationProps,
	compileModelAssociationData,
} = require('../utils/modelAssociations.util');

// Nodester query:
const NQLexer = require('../middlewares/ql/sequelize/interpreter/QueryLexer');
const traverseNQuery = require('nodester/query/traverse');


module.exports = {
	implementsCRUD: _implementsCRUD
}


/**
 * Sets all of CRUD methods to Model.
 *
 * @param {Object} modelDefinition
 *
 * @access public
 * @alias implementsCRUD
 */
function _implementsCRUD(modelDefinition) {
	if (!modelDefinition) {
		const err = new TypeError(`"modelDefinition" argument is not provided.`);
		throw err;
	}

	// Create.
	modelDefinition.createWithIncludes = _createWithIncludes.bind(modelDefinition);

	// Read:
	modelDefinition.findById = _findById.bind(modelDefinition);
	modelDefinition.findMany = _findMany.bind(modelDefinition);

	// Update:
	modelDefinition.updateOne = _updateOne.bind(modelDefinition);
	modelDefinition.updateById = _updateById.bind(modelDefinition);

	// Delete:
	modelDefinition.deleteOne = _deleteOne.bind(modelDefinition);
	modelDefinition.deleteById = _deleteById.bind(modelDefinition);
}


/** Main mixinis: */
async function _createWithIncludes(
	data = {}
) {
	try {
		const instance = await this.create(data);

		if (!instance) {
			const err = new Error(`Failed to create model.`);
			err.name = 'CreateRecordError';
			throw err;
		}

		// Variable that will contain data from parent instance and associations, mentioned in data.
		let fullInstanceData = instance.toJSON();

		// If this model has associations:
		if (modelHasAssociations(this)) {
			const allModelAssociations = Object.entries(this.associations);

			for (const [associationName, associationDefinition] of allModelAssociations) {

				// If data of this association is present:
				if (!!data[associationName]) {
					// Preparation to work with association:
					const {
						associatedModel,
						foreignKey,
						associationType,
						accessors
					} = getModelAssociationProps(associationDefinition);

					// If association type is HasMany or HasOne:
					if (associationType === 'HasMany' || associationType === 'HasOne') {

						// Process current instance.
						const operationsResults = await _updateOrCreateOrDeleteBasedOnAssociationData({
							associatedModel: associatedModel,
							dataOfAssociation: data[associationName],
							parentModelId: instance.id,
							parentForeignKey: foreignKey,
						});

						fullInstanceData[associationName] = _unwrapUpdateOrCreateOrDeleteOperationsResults(
							operationsResults,
							associationType
						);
					}
					// BelongsToMany: link existing records via junction table.
					else if (associationType === 'BelongsToMany') {
						const associationData = Array.isArray(data[associationName])
							? data[associationName]
							: [data[associationName]];

						const pkField = associatedModel.primaryKeyField;
						const ids = [];

						for (const item of associationData) {
							const exists = await associatedModel.findByPk(item[pkField]);
							if (!exists) {
								const err = new Error(
									`Before you can associate ${associationName} with ${this.name}, ${associationName} must be created separately.`
								);
								err.status = 406;
								throw err;
							}
							ids.push(item[pkField]);
						}

						await instance[accessors.set](ids);
						fullInstanceData[associationName] = associationData;
					}

					fullInstanceData[associationName] = fullInstanceData[associationName] ?? data[associationName];
				}
			}

		}

		// Variable, that is used by _updateById,
		// but we will also put it here to make API consistent.
		const isNewRecord = true;
		return Promise.resolve([isNewRecord, fullInstanceData]);
	}
	catch (error) {
		return Promise.reject(error);
	}
}

function _findById(
	id = null,
	opts = {}
) {
	const { query } = opts;

	let _query = {};

	if (typeof query === 'string') {
		const lexer = new NQLexer(query);
		const nquery = lexer.query;
		_query = traverseNQuery(nquery, null, this);
		_query.where = {
			..._query.where,
			id: id
		}
	}
	else {
		const {
			include,
			paranoid
		} = opts;

		_query = {
			where: { id },
			include: include,
			paranoid: !!paranoid
		};
	}

	return this.findOne(_query);
}

function _findMany(opts = {}) {
	const { query } = opts;

	let _query = {};

	if (typeof query === 'string') {
		const lexer = new NQLexer(query);
		const nquery = lexer.query;
		_query = traverseNQuery(nquery, null, this);
	}
	else {
		const {
			include,
			paranoid
		} = opts;

		_query = {
			include: include,
			paranoid: !!paranoid
		};
	}


	return this.findAll(_query);
}


async function _updateOne(
	where,
	data,
	opts = {}
) {
	try {
		const include = opts.include ?? [];

		const { instance, isNewRecord } = await _resolveInstanceForUpdate(
			this,
			{ where, data, include, findOrCreate: opts.findOrCreate }
		);

		// Will contain data from parent instance and associations.
		const fullInstanceData = instance.toJSON();
		const parentData = { ...data };

		for (const includeConfig of include) {
			const { association } = includeConfig;

			if (parentData[association] === undefined) {
				continue;
			}

			// Remove association from parentData (handled separately).
			delete parentData[association];

			const associationDefinition = this.associations[association];
			const {
				associatedModel,
				associationType,
				foreignKey
			} = getModelAssociationProps(associationDefinition);

			const applyAssociationUpdate = ASSOCIATION_UPDATE_HANDLERS[associationType];
			if (!applyAssociationUpdate) {
				continue;
			}

			const includeData = data[association];
			fullInstanceData[association] = await applyAssociationUpdate({
				instance,
				association,
				associationDefinition,
				associatedModel,
				includeData,
				foreignKey,
				pkField: associatedModel.primaryKeyField,
				parentModelName: this.name,
				associationUpdateOpts: {
					findOrCreate: true,
					include: associatedModel.getIncludesTree(includeData)
				}
			});
		}

		// Update parent model instance:
		if (isNewRecord === false) {
			instance.set(parentData);
			await instance.save();
		}

		// `fullInstanceData` was snapshotted BEFORE the parent columns were saved,
		// so its scalar fields still hold the pre-update values. Overlay the freshly
		// saved parent columns while keeping the association data assembled above.
		_overlaySavedColumns(fullInstanceData, instance, Object.keys(parentData));

		return Promise.resolve({
			_is_new_record: isNewRecord,
			...fullInstanceData
		});
	}
	catch (error) {
		return Promise.reject(error);
	}
}

async function _updateById(
	id = null,
	data = {},
	opts = {}
) {
	const where = { id };
	return this.updateOne(
		where,
		data,
		opts
	);
}


function _deleteOne(query = {}) {
	const _query = {
		...query,
		limit: 1
	}
	return this.destroy(_query);
}

function _deleteById(
	id = null
) {
	const query = {
		where: { id }
	};
	return this.destroy(query);
}
/** Main mixinis\ */

/** Subfunctions: */

/**
 * True when `where` is a non-empty object with no undefined values,
 * i.e. safe to use for looking up an existing record.
 */
function _hasValidWhere(where) {
	return !!where
		&& Object.keys(where).length > 0
		&& Object.values(where).every(val => val !== undefined);
}

/**
 * Finds the record targeted by `where`, or creates one when `findOrCreate`
 * is enabled. Throws a `NotFound` error otherwise.
 *
 * @returns {Promise<{ instance: Object, isNewRecord: boolean }>}
 */
async function _resolveInstanceForUpdate(
	model,
	{ where, data, include, findOrCreate }
) {
	const instance = _hasValidWhere(where)
		? await model.findOne({ where, include })
		: null;

	if (instance) {
		return { instance, isNewRecord: false };
	}

	if (findOrCreate === true) {
		return { instance: await model.create(data), isNewRecord: true };
	}

	const err = new Error(`Model not found`);
	err.name = 'NotFound';
	throw err;
}

/**
 * Overlays the freshly saved parent columns onto `target` in place,
 * so association data assembled earlier is preserved.
 */
function _overlaySavedColumns(target, instance, keys) {
	const savedData = instance.toJSON();
	for (const key of keys) {
		target[key] = savedData[key];
	}
	return target;
}

/**
 * Reconciles a HasMany association: an empty array removes all children,
 * otherwise each child is updated (or created) under the parent's foreign key.
 */
async function _applyHasManyUpdate({
	instance,
	associatedModel,
	includeData,
	foreignKey,
	pkField,
	associationUpdateOpts
}) {
	// Empty array removes all old associations:
	if (Array.isArray(includeData) && includeData.length === 0) {
		await associatedModel.destroy({ where: { [foreignKey]: instance.id } });
		return [];
	}

	// Note: for now we are only able to work with a model with single PrimaryKey.
	const promises = includeData.map(singleData => associatedModel.updateOne(
		{ [pkField]: singleData[pkField] },
		{ ...singleData, [foreignKey]: instance.id },
		associationUpdateOpts
	));

	return Promise.all(promises);
}

/**
 * Reconciles a HasOne association: `null` removes the child, otherwise the
 * child is matched by primary key when present, else by the parent's foreign key.
 */
async function _applyHasOneUpdate({
	instance,
	associatedModel,
	includeData,
	foreignKey,
	pkField,
	associationUpdateOpts
}) {
	// Null removes the old association:
	if (includeData === null) {
		await associatedModel.destroy({ where: { [foreignKey]: instance.id } });
		return null;
	}

	// Note: for now we are only able to work with a model with single PrimaryKey.
	const where = _hasValue(includeData[pkField])
		? { [pkField]: includeData[pkField] }
		: { [foreignKey]: instance.id };

	return associatedModel.updateOne(
		where,
		{ ...includeData, [foreignKey]: instance.id },
		associationUpdateOpts
	);
}

/**
 * Reconciles a BelongsToMany association by replacing the full set of links
 * through the junction table. Every referenced record must already exist.
 */
async function _applyBelongsToManyUpdate({
	instance,
	association,
	associationDefinition,
	associatedModel,
	includeData,
	pkField,
	parentModelName
}) {
	const associationItems = Array.isArray(includeData) ? includeData : [includeData];
	const ids = [];

	for (const item of associationItems) {
		const exists = await associatedModel.findByPk(item[pkField]);
		if (!exists) {
			const err = new Error(
				`Before you can associate ${association} with ${parentModelName}, ${association} must be created separately.`
			);
			err.status = 406;
			throw err;
		}
		ids.push(item[pkField]);
	}

	// Replaces the full set of associations via the junction table.
	// Sending an empty array removes all associations.
	const { accessors } = getModelAssociationProps(associationDefinition);
	await instance[accessors.set](ids);

	return associationItems;
}

// Maps an association type to the handler that reconciles it during _updateOne.
const ASSOCIATION_UPDATE_HANDLERS = {
	HasMany: _applyHasManyUpdate,
	HasOne: _applyHasOneUpdate,
	BelongsToMany: _applyBelongsToManyUpdate,
};

function _hasValue(value) {
	return value !== undefined && value !== null;
}

async function _updateOrCreateOrDelete(
	modelDefinition,
	data
) {
	try {
		let operation = 'skipped';
		let newInstance = null;

		// If this instance has an id, update it,
		// if no, create from data:
		if (!isNaN(data?.id)) {
			// If marked for deletion, delete:
			if (!!data?.should_delete) {
				operation = 'deleted';
				await _deleteById.bind(modelDefinition)(data.id);
			}
			else {
				operation = 'updated';
				newInstance = await _updateById.bind(modelDefinition)(data.id, data);
			}
		}
		else {
			operation = 'created';
			newInstance = await _createWithIncludes.bind(modelDefinition)(data);
		}

		return Promise.resolve({
			newInstance,
			operation,
		});
	}
	catch (error) {
		return Promise.reject(error);
	}
}

async function _updateOrCreateOrDeleteBasedOnAssociationData({
	associatedModel,
	dataOfAssociation,
	parentModelId,
	parentForeignKey,
}) {
	try {
		let result = [];

		// Detect data type.
		const isSingleInstance = Array.isArray(dataOfAssociation) === false;

		// If single instance of associated model:
		if (isSingleInstance) {
			const operationResult = await _updateOrCreateOrDelete(
				associatedModel,
				compileModelAssociationData({
					dataOfAssociation,
					parentForeignKey,
					parentModelId,
				})
			);

			result = [operationResult];
		}
		// If multiple instances of associated model:
		else {
			// Update or create each:
			const promises = dataOfAssociation.map(
				(data) => _updateOrCreateOrDelete(
					associatedModel,
					compileModelAssociationData({
						dataOfAssociation: data,
						parentForeignKey: parentForeignKey,
						parentModelId: parentModelId,
					})
				)
			);

			// Wait untill all instances go through process.
			result = await Promise.all(promises);
		}

		return Promise.resolve(result);
	}
	catch (error) {
		return Promise.reject(error);
	}
}

function _unwrapUpdateOrCreateOrDeleteOperationsResults(
	operationsResults,
	associationType
) {
	// If instance was not deleted, add it to final array.
	const result = operationsResults.filter(({ operation }) => operation !== 'deleted')
		.map(({ newInstance }) => newInstance[1]);

	// If this association referenced only certain record,
	// unwrap "result" array and send first element:
	if (associationType === 'HasOne') {
		return result[0];
	}

	return result;
}
/** Subfunctions\ */
