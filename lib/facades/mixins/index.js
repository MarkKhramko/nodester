/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const {
	getOne,
	getMany,
	createOne,
	updateOne,
	deleteOne
} = require('../methods');

// Utils:
const { Sequelize } = require('sequelize');
const { lowerCaseFirstLetter } = require('nodester/utils/strings');

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');


module.exports = {
	withDefaultCRUD: _withDefaultCRUD,

	setMethod: _setMethod
}

/**
 * Sets one of or all of CRUD methods to Facade.
 *
 * @param {NodesterFacade} facade
 * @param {Object} options
 * @param {Model}  options.model
 * @param {string} options.name
 * @param {Array}  options.only
 *
 * @return {NodesterFacade} facade
 *
 * @alias withDefaultCRUD
 * @access public
 */
function _withDefaultCRUD(facade, options={}) {
	ensure(facade, 'function|object,required', 'facade');
	ensure(options, 'object,required', 'options');
	ensure(options.model, 'function|object,required', 'options.model');

	const {
		model,

		// Optional:
		name,
		only
	} = options;
	
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
	// Model info\

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
		facade.afterDeleteOne = async () => {};
	}

	return facade;
}

/**
 * Sets one of CRUD methods to a Facade.
 *
 * @param {NodesterFacade} facade
 * @param {Function} fn
 *
 * @return {NodesterFacade} facade
 *
 * @alias setMethod
 * @access public
 */
function _setMethod(facade, fn) {
	ensure(facade, 'function|object,required', 'facade');
	ensure(fn, 'function,required', 'fn');

	facade[fn] = fn.bind(facade);

	return facade;
}
