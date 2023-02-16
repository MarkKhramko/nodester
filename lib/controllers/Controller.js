// Constants.
const VISITOR = 'visitor';
// Data extractor:
const Extractor = require('nodester/models/Extractor');
// Preprocessors:
const QueryPreprocessor = require('nodester/preprocessors/QueryPreprocessor');
const BodyPreprocessor = require('nodester/preprocessors/BodyPreprocessor');
// Reponse protocol generator.
const APIResponseFactory = require('nodester/factories/responses/api');
// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class Controller {
	constructor({
		modelFacade,

		queryPreprocessor,
		bodyPreprocessor,

		apiResponseFactory,

		// Options.
		withFiles,
	}) {
		if (!modelFacade) {
			throw new Error('"modelFacade" argument is invalid.');
		}
		
		// Main model.
		const model = modelFacade?.model;
		
		// Set main services & utils:
		this.extractor = new Extractor(model, { withFiles: !!withFiles });
		this.facade = modelFacade;

		// Set preprocessors:
		// TODO: includes preprocessor.
		this.queryPreprocessor = queryPreprocessor ?? new QueryPreprocessor();
		this.bodyPreprocessor = bodyPreprocessor ?? null;

		// Extract plural name of model.
		const modelPluralName = model?.options?.name?.plural;
		// Set private name of this controller.
		this.name = `${modelPluralName ?? '_INVALID_NAME_'}Controller`;
		
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
				errorResponse.details = { message:errorMessage };
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

	/* POST: */
	async createOne(req, res) {
		try {
			// Extract all required info:
			const {
				// query,
				includes
			} = await this.extractQuery(req, res);

			// Extract request's body.
			const { body } = await this.extractBody(req, res);

			// Extract new instance data.
			const data = this.extractor.extractInstanceDataFromObject(
										body,
										includes,
										{
											skipIdValidation: true
										});

			const result = await this.facade.createOne({ data, includes });

			// Hook.
			await this.afterCreateOne(req, res, result);
			
			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.createOne error:`, error);
			return this.processError(error, req, res);
		}
	}
	/* POST\ */

	/* GET: */
	async getOne(req, res) {
		try {
			// Extract all required info:
			const {
				query,
				includes
			} = await this.extractQuery(req, res);

			const params = {
				query,
				includes,
			}

			// If Query or Params contains main identifier (id),
			// validate it:
			if (!!query.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												query,
												null,
												{
													skipValidation: true
												});
				params.id = id;
			}
			// If Request's Params contains main identifier (id),
			// validate it:
			else if (!!req.params.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												req.params,
												null,
												{
													skipValidation: true
												});
				params.id = id;
			}

			const result = await this.facade.getOne(params);

			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.getOne error:`, error);
			return this.processError(error, req, res);
		}
	}

	async getMany(req, res) {
		try {
			// Extract all required info:
			const {
				query,
				includes
			} = await this.extractQuery(req, res);

			const params = {
				query,
				includes,
			}

			// If Query contains main identifier (id),
			// validate it:
			if (!!query.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												query,
												null,
												{
													skipValidation: true
												});
				params.query.id = id;
			}
			// If Request's Params contains main identifier (id),
			// validate it:
			else if (!!req.params.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												req.params,
												null,
												{
													skipValidation: true
												});
				params.query.id = id;
			}

			const result = await this.facade.getMany(params);

			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.getMany error:`, error);
			return this.processError(error, req, res);
		}
	}
	/* GET\ */

	/* PUT: */
	async updateOne(req, res) {
		try {
			// Extract all required info:
			const {
				query,
				includes
			} = await this.extractQuery(req, res);

			// Extract request's body.
			const { body } = await this.extractBody(req, res);

			// Init facade params.
			const facadeParams = {
				query,
				includes,
			};

			// If request params contain main identifier (id),
			// extract & validate it:
			if (!!req.params.id) {
				// Extract main identifier.
				facadeParams.query.id = parseInt(req.params.id);
			}
			// If Query contains main identifier (id),
			// validate it:
			else if (!!query.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												query,
												null,
												{
													skipValidation: true
												});
				facadeParams.query.id = id;
			}
			// Extract instance data.
			const data = this.extractor.extractInstanceDataFromObject(
										body,
										includes,
										{
											skipIdValidation: true,
											skipValidation: true
										});
			facadeParams.data = data;

			const result = await this.facade.updateOne(facadeParams);

			// Hook.
			await this.afterUpdateOne(req, res, result);
			
			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.updateOne error:`, error);
			return this.processError(error, req, res);
		}
	}

	/* ! Warning !
	 * Unfinished method
	 * Do not use!
	 */
	async updateMany(req, res) {
		try {
			// Extract all required info:
			const {
				query,
				includes
			} = await this.extractQuery(req, res);

			// If Query contains main identifier (id),
			// extract & validate it:
			if (!!query.id) {
				// Extract main identifier.
				const { id } = this.extractor.extractInstanceDataFromObject(
												query,
												null,
												{
													skipValidation: true
												});
				query.id = id;
			}
			
			// Extract data array:
			const data = this.extractor.extractArrayDataFromObject(
										req.body,
										{
											skipIdValidation: true,
											skipValidation: true
										});

			console.log("Controller.updateMany", { data });

			// TODO: Finish procedure
			return;
			// const result = await this.facade.updateMany({ data, includes });

			// return this.createOKResponse({
			// 	res,
			// 	content: { ...result }
			// });
		}
		catch(error) {
			console.error(`${ this.name }.updateMany error:`, error);
			return this.processError(error, req, res);
		}
	}
	/* PUT\ */

	/* DELETE: */
	async deleteOne(req, res) {
		try {
			// Extract main identifier.
			const { id } = this.extractor.extractInstanceDataFromObject(
											req.params,
											null,
											{
												skipValidation: true
											});

			const result = await this.facade.deleteOne({ id });

			// Hook.
			await this.afterDeleteOne(req, res, result);
			
			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.deleteOne error:`, error);
			return this.processError(error, req, res);
		}
	}
	/* DELETE\ */

	/*
	 * Hooks:
	 */
	async afterCreateOne(
		req, res,
		facadeResult
	) {
		// This method is empty, as it should be overwritten.
		const content = { ...facadeResult };
		return Promise.resolve(content);
	}

	async afterUpdateOne(
		req, res,
		facadeResult
	) {
		// This method is empty, as it should be overwritten.
		const content = { ...facadeResult };
		return Promise.resolve(content);
	}

	async afterDeleteOne(
		req, res,
		facadeResult
	) {
		// This method is empty, as it should be overwritten.
		const content = { ...facadeResult };
		return Promise.resolve(content);
	}
	/*
	 * Hooks\
	 */

	// Preprocessors:
	async extractQuery(req, res) {
		try {
			// Extract role.
			const role = req?.token?.parsed?.role ?? VISITOR;

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

	async extractBody(req, res, externalBodyObject=null) {
		try {
			// Extract role.
			const role = req?.token?.parsed?.role ?? VISITOR;

			// Extract body:
			let body = externalBodyObject ?? req.body;

			if (!!this.bodyPreprocessor) {
				body = await this.bodyPreprocessor.extract(
												req,
												role,
											);
			}

			return Promise.resolve({
				body,
			});
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
	// Preprocessors\
}
