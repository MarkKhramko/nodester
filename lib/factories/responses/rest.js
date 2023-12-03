/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

/*
 * REST response factory.
 */
const Params = require('nodester/params');
const { NodesterError } = require('nodester/errors');


module.exports = {
	createGenericResponse: _createGenericResponse,
	createOKResponse: _createOKResponse,
	createErrorResponse: _createErrorResponse,
}

/*
 * Format for all API responses will be JSON
 * {
 * 	content: {...}
 * 	error: {...}
 * }
 * Status code is sent in header.
 * 	
 * If error is not present, error must be null.
 * If error is present, content can be null (But it's not required).
 *
 * @param {ServerResponse} res
 * @param {Object} [options]
 * @param {Object} options.error
 * @param {Object} options.content (optional)
 * @param {Int}    options.status
 *
 * @alias createGenericResponse
 * @api public
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
					statusCode = 401;
					break;
				}
				case 'NotFound': {
					statusCode = 404;
					break;
				}
				case 'ValidationError': {
					statusCode = 422;
					break;
				}
				case 'ConflictError': {
					statusCode = 409;
					break;
				}
				case 'SequelizeUniqueConstraintError': {
					statusCode = 409;
					details.errors = error?.errors;
					break;
				}
				default:
					statusCode = status;

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
 * @param {Object} options.content (optional)
 * @param {Object} options.status (optional)
 *
 * @alias createOKResponse
 * @api public
 */
function _createOKResponse(res, options={}) {

	return this.createGenericResponse(res, { 
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
 * @param {Object} options.error
 * @param {Object} options.content (optional)
 * @param {Int}    options.status
 *
 * @alias createErrorResponse
 * @api public
 */
function _createErrorResponse(res, options) {

	return this.createGenericResponse(res, {
		...options,
		status: options?.status ?? 500,
	});
}
