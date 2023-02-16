// Query preprocessor.
const QueryPreprocessor = require('nodester/preprocessors/QueryPreprocessor');
// Reponse protocol generator.
const APIResponseFactory = require('nodester/factories/responses/api');
// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class ServiceController {
	constructor({
		name,
		queryPreprocessor,
		apiResponseFactory,
	}) {
		if (!name) {
			const err = new Err();
			err.details = 'Argument "name" is required';
			throw err;
		}
		// Set private name of this controller.
		this.name = name;

		// Set preprocessors:
		this.queryPreprocessor = queryPreprocessor ?? new QueryPreprocessor();
		// TODO: body preprocessor.

		// Init standard API response factory.
		const standardAPIResponseFactory = new APIResponseFactory();
		// Set response factory:
		this.createOKResponse = apiResponseFactory?.createOKResponse ?? 
														standardAPIResponseFactory.createOKResponse.bind(standardAPIResponseFactory);
		this.createErrorResponse = apiResponseFactory?.createErrorResponse ??
															 standardAPIResponseFactory.createErrorResponse.bind(standardAPIResponseFactory);
	}

	processError(error, req, res) {
		// Default error message.
		let errorMessage = error?.message ?? 'Internal server error';
		// Default HTTP status code.
		let statusCode = error?.status ?? error?.statusCode ?? 500;
		// Error response object.
		let errorResponse = {};

		switch(error.name) {
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
				errorResponse.details = { message: 'Error' };
				break;
			}
			default: {
				errorResponse.details = { message: errorMessage };
				break;
			}
		}

		// Send error response with provided status code.
		return this.createErrorResponse({
			res,
			error: { 
				...errorResponse,
				code: statusCode
			},
			status: statusCode
		});
	}

	// Preprocessors:
	async extractQuery(req, res) {
		try {
			// Extract role.
			const role = req?.token?.parsed?.role ?? 'visitor';

			// Extract query:
			const query = await this.queryPreprocessor.extract(
											req,
											role,
										);
			const { includes } = req.query;

			return Promise.resolve({
				query,
				includes,
			});
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
}
