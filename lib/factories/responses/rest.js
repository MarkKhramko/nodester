/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

/*
 * REST response factory.
 */

const ResponseFormats = require('../../constants/ResponseFormats');


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
 * If error is not present, error should be null.
 * If error is present, content can be null (But it's not required).
 *
 * @param {ServerResponse} res
 * @param {Object} options
 *
 * @alias createGenericResponse
 * @api public
*/
function _createGenericResponse(
	res,
	options = {
		status: 200,
		content: {},
		error: null,
		format: ResponseFormats.JSON
	}
) {
	try {
		const data = {
			content: options?.content ?? null,
			error: options?.error ?? null
		};

		switch(options?.format) {
			case ResponseFormats.JSON:
				return options?.res.status(options?.status).json(data);
			case ResponseFormats.XML:
				// TODO: format data into XML.
				return options?.res.status(options?.status).send(data);
				break;
			default: {
				const err = new TypeError("No format specified.");
				throw err;
			}
		}
	}
	catch(error) {
		const err = new Error(`Could not create generic response: ${error.message}`);
		err.name = error?.name;
		err.code = error?.code;
		throw err;
	}
}


/**
 * Sends response with status code 200.
 * Should be called on all successful respones.
 *
 * @param {ServerResponse} res
 * @param <Object> content
 * @param <String> format
 *
 * @alias createOKResponse
 * @api public
 */
function _createOKResponse(res, options={}) {

	return this.createGenericResponse(res, { 
		...options,
		status: 200,
		format: options?.format ?? ResponseFormats.JSON
	});
}


/**
 * Sends response with provided error code.
 * Should be called on all failed respones.
 *
 * @param {ServerResponse} res
 * @param <Object> error
 * @param <Object> content (optional)
 * @param <Int>		 status
 * @param <String> format
 *
 * @alias createErrorResponse
 * @api public
 */
function _createErrorResponse(res, options) {

	return this.createGenericResponse(res, {
		...options,
		status: options?.status ?? 500,
		format: options?.format ?? ResponseFormats.JSON
	});
}
