/*
 *	CRUD mixins for any model:
 */
// Utils:
const {
	modelHasAssociations,
	getModelAssociationProps,
	compileModelAssociationData,
} = require('../utils/modelAssociations.util');


module.exports = {
	implementsCRUD: _implementsCRUD
}


/**
 * Sets all of CRUD methods to Model.
 *
 * @param {Object} modelDefinition
 *
 *
 * @api public
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
	modelDefinition.findOneWithIncludes = _findOneWithIncludes.bind(modelDefinition);

	// Update:
	modelDefinition.updateOne = _updateOne.bind(modelDefinition);
	modelDefinition.updateById = _updateById.bind(modelDefinition);

	// Delete:
	modelDefinition.deleteOne = _deleteOne.bind(modelDefinition);
	modelDefinition.deleteById = _deleteById.bind(modelDefinition);
}


/* Main mixinis: */
async function _createWithIncludes(
	data={}
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

			for (const [ associationName, associationDefinition ] of allModelAssociations) {

				// If data of this association is present:
				if (!!data[associationName]) {
					// Preparation to work with association:
					const {
						associatedModel,
						foreignKey,
						associationType
					} = getModelAssociationProps(associationDefinition, data);

					// If association type is HasMany or HasOne (We don't work with any other):
					if (associationType === 'HasMany' || associationType === 'HasOne') {

						// Process current instance.
						const operationsResults = await _updateOrCreateOrDeleteBasedOnAssociationData({
							associatedModel: associatedModel,
							dataOfAssociation: data[associationName],
							parentModelId: instance.id,
							parentForeignKey: foreignKey,
						});

						fullInstanceData[associationName] =_unwrapUpdateOrCreateOrDeleteOperationsResults(
							operationsResults,
							associationType
						);
					}

					fullInstanceData[associationName] = fullInstanceData[associationName] ?? data[associationName];
				}
			}

		}

		// Variable, that is used by _updateById,
		// but we will also put it here to make API consistent.
		const isNewRecord = true;
		return Promise.resolve([ isNewRecord, fullInstanceData ]);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

function _findById(
	id=null,
	include=[],
	paranoid=true
) {
	const query = {
		where: { id },
		include: include,
		paranoid: !!paranoid
	};
	return this.findOne(query);
}

function _findOneWithIncludes(
	where={},
	include=[],
	paranoid=true
) {
	const query = {
		where: where,
		include: include,
		paranoid: !!paranoid
	};
	return this.findOne(query);
}


async function _updateOne(
	where,
	data,
	include=[]
) {
	try {
		const instance = await this.findOneWithIncludes(where, include);

		if (!instance) {
			const err = new Error(`Model not found`);
			err.name = 'NotFound';
			throw err;
		}

		// Update parent model instance:
		instance.set({ ...data });
		const saveResult = await instance.save();
		const { isNewRecord } = saveResult;

		// Variable that will contain data from parent instance and associations, mentioned in data.
		let fullInstanceData = instance.toJSON();

		// If this model has associations:
		if (modelHasAssociations(this)) {

			const associationsEntries = Object.entries(this.associations);
			for (const [ associationName, associationDefinition ] of associationsEntries) {

				// If data of this association is present:
				if (!!data[associationName]) {
					
					// Preparation to work with association:
					const {
						associatedModel,
						foreignKey,
						associationType
					} = getModelAssociationProps(associationDefinition, data);

					// If association type is HasMany or HasOne (We don't work with any other):
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

					fullInstanceData[associationName] = fullInstanceData[associationName] ?? data[associationName];
				}
			}

		}
		
		// Select this instance again, if includes was set:
		if (include?.length > 0) {
			const updatedInstance = await this.findOneWithIncludes(where, include);
			fullInstanceData = updatedInstance.toJSON();
		}

		return Promise.resolve([ isNewRecord, fullInstanceData ]);
	}
	catch(error) {
		return Promise.reject(error);
	}
}

async function _updateById(
	id=null,
	data={},
	include=[]
) {
	const where = { id };
	return this.updateOne(
		where,
		data,
		include
	);
}


function _deleteOne(query={}) {
	const _query = {
		...query,
		limit: 1
	}
	return this.destroy(_query);
}

function _deleteById(
	id=null
) {
	const query = {
		where: { id }
	};
	return this.destroy(query);
}
/* Main mixinis\ */

/* Subfunctions: */
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
	catch(error) {
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

			result = [ operationResult ];
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
	catch(error) {
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
/* Subfunctions\ */
