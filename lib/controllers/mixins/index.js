/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const {
	NODESTER_QUERY_ERROR,
	UNAUTHORIZED_ERROR,
	NOT_FOUND_ERROR,
	VALIDATION_ERROR,
	CONFLICT_ERROR,
	SEQUELIZE_UNIQUE_CONSTRAINT_ERROR,
	INTERNAL_VALIDATION_ERROR
} = require('nodester/constants/ErrorCodes');

const {
	getOne,
	getMany,
	createOne,
	updateOne,
	deleteOne
} = require('../methods');

// Arguments validator.
const { ensure } = require('../../validators/arguments');


module.exports = {
	withDefaultCRUD: _withDefaultCRUD,
	withDefaultErrorProcessing: _withDefaultErrorProcessing,

	setFacade: _setFacade,
	setMethod: _setMethod
}


/**
 * Sets one of or all of CRUD methods to Controller.
 *
 * @param {Function|Object} controller
 * @param {Object} options
 * @param {Function|Object} options.facade
 * @param {String}					options.name
 * @param {Array}						options.only
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias withDefaultCRUD
 */
function _withDefaultCRUD(controller, options={}) {
	ensure(controller, 'function|object,required', 'controller');
	ensure(options, 'object,required', 'options');

	const {
		facade,

		// Optional:
		name,
		only
	} = options;

	_setFacade(controller, facade);

	// Set model info:
	const model = facade.model;
	// Extract plural name of this model.
	const modelPluralName = model?.options?.name?.plural;
	// Set read-only name of this controller:
	Object.defineProperty(controller, 'name', {
		value: name ?? `${ modelPluralName ?? controller.name }Controller`,
		writable: false
	});


	// If only certain methods should be set:
	if (!!only) {
		for (const selectedMethod of only) {
			switch(selectedMethod) {
				case 'getOne':
					controller.getOne    = getOne.bind(controller);
					break;
				case 'getMany':
					controller.getMany   = getMany.bind(controller);
					break;
				case 'createOne':
					controller.createOne = createOne.bind(controller);
					break;
				case 'updateOne':
					controller.updateOne = updateOne.bind(controller);
					break;
				case 'deleteOne':
					controller.deleteOne = deleteOne.bind(controller);
					break;

				default:
					break;
			}
		}
	}
	// Or set all methods:
	else {
		controller.getOne    = getOne.bind(controller);
		controller.getMany   = getMany.bind(controller);
		controller.createOne = createOne.bind(controller);
		controller.updateOne = updateOne.bind(controller);
		controller.deleteOne = deleteOne.bind(controller);

		// Set empty hooks:
		controller.afterGetOne    = async () => {};
		controller.afterGetMany   = async () => {};
		controller.afterCreateOne = async () => {};
		controller.afterUpdateOne = async () => {};
		controller.afterDeleteOe  = async () => {};
	}

	// TODO: remove.
	controller.respondOk = (res, data) => res.json(data);
	controller.respondNotOk = (res, data) => { res.status(data.status); res.json(data); };

	return controller;
}


/**
 * Sets default error responses to Controller.
 *
 * @param {Function|Object} controller
 * @param {Object} options
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias withDefaultErrorProcessing
 */
function _withDefaultErrorProcessing(controller, options={}) {
	ensure(controller, 'function|object,required', 'controller');

	// Set processError:
	controller.processError = function (error, req, res) {
		
		// Default error message.
		let errorMessage = error?.message ?? 'Internal server error';
		// Default HTTP status code.
		let statusCode = error?.status ?? error?.statusCode ?? 500;
		// Error response object.
		let errorResponse = {};

		switch(error.name) {
			case UNAUTHORIZED_ERROR: {
				statusCode = 401;
				errorResponse.details = { message: 'Unauthorized' };
				break;
			}
			case NOT_FOUND_ERROR: {
				statusCode = 404;
				errorResponse.details = { message: errorMessage };
				break;
			}
			case NODESTER_QUERY_ERROR: {
				statusCode = 422;
				errorResponse.details = { message: errorMessage };
				break;
			}
			case VALIDATION_ERROR: {
				statusCode = 422;
				errorResponse.details = error?.details;
				break;
			}
			case CONFLICT_ERROR: {
				statusCode = 409;
				errorResponse.details = error?.details ?? error?.message;
				break;
			}
			case SEQUELIZE_UNIQUE_CONSTRAINT_ERROR: {
				statusCode = 409;
				errorResponse.details = error?.errors;
				break;
			}
			case INTERNAL_VALIDATION_ERROR: {
				statusCode = 500;
				errorResponse.details = { message: errorMessage };
				break;
			}
			default: {
				errorResponse.details = { message: errorMessage };
				break;
			}
		}

		// Send error response with provided status code:
		const data = {
			error: {
				...errorResponse,
				code: statusCode
			},
			status: statusCode
		}

		if (!!this.respondNotOk) {
			return this.respondNotOk(res, data);
		}

		// Barebones response:
		res.status(statusCode);
		res.json(data);
	}

	return controller;
}


/**
 * Sets one of or all of CRUD methods to Controller.
 *
 * @param {Function|Object} controller
 * @param {Function|Object} facade
 * @param {String} facadeName
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias setFacade
 */
function _setFacade(controller, facade, facadeName=null) {
	ensure(controller, 'function|object,required', 'controller');
	ensure(facade, 'function|object,required', 'facade');

	// Set main facade:
	if (facade.constructor.name === 'Function') {
		controller[facadeName ?? 'facade'] = new facade();
	}
	else {
		controller[facadeName ?? 'facade'] = facade;
	}

	return controller;
}


/**
 * Sets one of CRUD methods to Controller.
 *
 * @param {Controller} controller
 * @param {Function} fn
 *
 * @return {Controller} controller
 *
 * @api public
 * @alias setMethod
 */
function _setMethod(controller, fn) {
	ensure(controller, 'function|object,required', 'controller');
	ensure(fn, 'function,required', 'fn');

	controller[fn] = fn.bind(controller);

	return controller;
}
