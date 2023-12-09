/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

/**
 * REST response factory.
 */
const Params = require('nodester/params');
const { NodesterError } = require('nodester/errors');


module.exports = {
	createGenericResponse: _createGenericResponse,
	createOKResponse: _createOKResponse,
	createErrorResponse: _createErrorResponse,
}

/**
 * Format for all API responses will be JSON
 * Status code is sent in header.
 *
 * @example
 * {
 *   content: {...}
 *   error: {...}
 * }
 * 	
 * If error is not present, error must be null.
 * If error is present, content can be null (But it's not required).
 *
 * @param {ServerResponse} res
 * @param {Object} [options]
 * @param {Object} [options.error]
 * @param {Object} [options.content]
 * @param {Int}    [options.status]
 *
 * @alias createGenericResponse
 * @access public
 */
function _createGenericResponse(res, options) {
	try {
		let {
			status,
			content,
			error
		} = Params(options, {
			status: 200,
			content: {},
			error: null
		});

		const data = {
			content: options?.content ?? null,
			error: null,
		};

		if (!!error) {
			const details = {
				message: error?.message
			}

			switch(error.name) {
				case 'Unauthorized': {
					status = 401;
					break;
				}
				case 'NotFound': {
					status = 404;
					break;
				}
				case 'ValidationError': {
					status = 422;
					break;
				}
				case 'ConflictError': {
					status = 409;
					break;
				}
				case 'SequelizeUniqueConstraintError': {
					status = 409;
					details.errors = error?.errors;
					break;
				}
				default:
					if (!!error?.errors) {
						details.errors = error?.errors;
					}
					break;
			}

			data.error = {
				details: details,
				code: error.name
			}
		}

		res.status(status);
		return res.json(data);
	}
	catch(error) {
		const err = new NodesterError(`Could not create generic response: ${ error.message }`);
		Error.captureStackTrace(err, _createGenericResponse);
		throw err;
	}
}


/**
 * Sends response with status code 200.
 * Should be called on all successful respones.
 *
 * @param {ServerResponse} res
 * @param {Object} [options]
 * @param {Object} [options.content]
 * @param {Object} [options.status]
 *
 * @alias createOKResponse
 * @access public
 */
function _createOKResponse(res, options={}) {
	return _createGenericResponse(res, { 
		...options,
		status: options?.status ?? 200,
	});
}


/**
 * Sends response with provided error code.
 * Should be called on all failed respones.
 *
 * @param {ServerResponse} res
 * @param {Object} [options]
 * @param {Object} [options.error]
 * @param {Object} [options.content]
 * @param {Int}    [options.status]
 *
 * @alias createErrorResponse
 * @access public
 */
function _createErrorResponse(res, options) {
	return _createGenericResponse(res, {
		...options,
		status: options?.status ?? 500,
	});
}
