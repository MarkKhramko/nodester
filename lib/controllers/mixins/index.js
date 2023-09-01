const {
	getOne,
	getMany,
	createOne,
	updateOne,
	deleteOne
} = require('../methods');


module.exports = {
	withDefaultCRUD: _withDefaultCRUD,
	withDefaultErrorProcessing: _withDefaultErrorProcessing,
	setMethod: _setMethod
}


/**
 * Sets one of or all of CRUD methods to Controller.
 *
 * @param {Function|Object} controller
 * @param {Object} opts
 * - @param {Function|Object} facade
 * - @param {String} name
 * - @param {Array} only
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias withDefaultCRUD
 */
function _withDefaultCRUD(controller, opts={}) {
	const {
		facade,

		// Optional:
		name,
		only
	} = opts;

	if (!controller) {
		const err = new TypeError(`'controller' argument is not provided.`);
		throw err;
	}

	if (!facade) {
		const err = new TypeError(`'opts.facade' argument is invalid.`);
		throw err;
	}

	// Set main facade:
	if (facade.constructor.name === 'Function') {
		controller.facade = new facade();
	}
	else {
		controller.facade = facade;
	}

	// Set model info:
	const model = facade.model;
	// Extract plural name of this model.
	const modelPluralName = model?.options?.name?.plural;
	// Set name of this controller:
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
 * @param {Object} opts
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias withDefaultErrorProcessing
 */
function _withDefaultErrorProcessing(controller, opts={}) {
	if (!controller) {
		const err = new TypeError(`'controller' argument is not provided.`);
		throw err;
	}

	// Set processError:
	controller.processError = function (error, req, res) {
		
		// Default error message.
		let errorMessage = error?.message ?? 'Internal server error';
		// Default HTTP status code.
		let statusCode = error?.status ?? error?.statusCode ?? 500;
		// Error response object.
		let errorResponse = {};

		switch(error.name) {
			case('Unauthorized'): {
				statusCode = 401;
				errorResponse.details = { message: 'Unauthorized' };
				break;
			}
			case('NotFound'): {
				statusCode = 404;
				errorResponse.details = { message: errorMessage };
				break;
			}
			case('ValidationError'): {
				statusCode = 406;
				errorResponse.details = error?.details;
				break;
			}
			case('ConflictError'): {
				statusCode = 409;
				errorResponse.details = error?.details ?? error?.message;
				break;
			}
			case('SequelizeUniqueConstraintError'): {
				statusCode = 409;
				errorResponse.details = error?.errors;
				break;
			}
			case('InternalValidationError'): {
				statusCode = 500;
				errorResponse.details = { message:'Error' };
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
 * Sets one of CRUD methods to Controller.
 *
 * @param {Function|Object} controller
 * @param {Object} opts
 *
 * @return {Function|Object} controller
 *
 * @api public
 * @alias withDefaultCRUD
 */
function _setMethod(controller,) {
	if (!controller) {
		const err = new TypeError(`'controller' argument is not provided.`);
		throw err;
	}


}
