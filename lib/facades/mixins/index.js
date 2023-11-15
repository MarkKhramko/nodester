const { Sequelize } = require('sequelize');

const {
	getOne,
	getMany,
	createOne,
	updateOne,
	deleteOne
} = require('../methods');
// Utils,
const { lowerCaseFirstLetter } = require('nodester/utils/strings');


module.exports = {
	withDefaultCRUD: _withDefaultCRUD,

	setMethod: _setMethod
}

/**
 * Sets one of or all of CRUD methods to Facade.
 *
 * @param {Function|Object} facade
 * @param {Object} opts
 * - @param {Function|Object} model
 * - @param {String} name
 * - @param {Array} only
 *
 * @return {Function|Object} facade
 *
 * @api public
 * @alias withDefaultCRUD
 */
function _withDefaultCRUD(facade, opts={}) {
	const {
		model,

		// Optional:
		name,
		only
	} = opts;

	if (!facade) {
		const err = new TypeError(`'facade' argument is not provided.`);
		throw err;
	}

	if (!model) {
		const err = new TypeError(`'model' argument is not provided.`);
		throw err;
	}
	
	// Set model info:
	//	Set model:
	Object.defineProperty(facade, 'model', {
		value: model,
		writable: false
	});

	//	Model name:
	const modelName = model.options.name;
	Object.defineProperty(facade, 'modelName', {
		value: {
			singular: lowerCaseFirstLetter(modelName.singular),
			plural: lowerCaseFirstLetter(modelName.plural)
		},
		writable: false
	});

	// Set name of this facade:
	Object.defineProperty(facade, 'name', {
		value: name ?? `${ modelName.plural ?? facade.name }Facade`,
		writable: false
	});


	// Set the name of the output:
	const outputName = {
		singular: Sequelize.Utils.underscore(modelName.singular),
		plural: Sequelize.Utils.underscore(modelName.plural)
	}

	switch (model.options.nodester.output) {
		case 'camelcased':
			outputName.singular = this.modelName.singular;
			outputName.plural = this.modelName.plural;
			break;
		case 'underscored':
		default:
			break;
	}

	Object.defineProperty(facade, 'outputName', {
		value: outputName,
		writable: false
	});


	// If only certain methods should be set:
	if (!!only) {
		for (const selectedMethod of only) {
			switch(selectedMethod) {
				case 'getOne':
					facade.getOne    = getOne.bind(facade);
					break;
				case 'getMany':
					facade.getMany   = getMany.bind(facade);
					break;
				case 'createOne':
					facade.createOne = createOne.bind(facade);
					break;
				case 'updateOne':
					facade.updateOne = updateOne.bind(facade);
					break;
				case 'deleteOne':
					facade.deleteOne = deleteOne.bind(facade);
					break;

				default:
					break;
			}
		}
	}
	// Or set all methods:
	else {
		facade.getOne    = getOne.bind(facade);
		facade.getMany   = getMany.bind(facade);
		facade.createOne = createOne.bind(facade);
		facade.updateOne = updateOne.bind(facade);
		facade.deleteOne = deleteOne.bind(facade);

		// Set empty hooks:
		facade.afterGetOne    = async () => {};
		facade.afterGetMany   = async () => {};
		facade.afterCreateOne = async () => {};
		facade.afterUpdateOne = async () => {};
		facade.afterDeleteOe  = async () => {};
	}

	return facade;
}

/**
 * Sets one of CRUD methods to Facade.
 *
 * @param {Facade} facade
 * @param {Function} functionDefinition
 *
 * @return {Facade} facade
 *
 * @api public
 * @alias setMethod
 */
function _setMethod(facade, functionDefinition) {
	if (!facade) {
		const err = new TypeError(`'facade' argument is not provided.`);
		throw err;
	}

	facade[functionDefinition] = functionDefinition.bind(facade);

	return facade;
}
