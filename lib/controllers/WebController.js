// Data extractor:
const Extractor = require('nodester/models/Extractor');
// Query preprocessor.
const QueryPreprocessor = require('nodester/preprocessors/QueryPreprocessor');
// Reponse protocol generator.
const WebResponseFactory = require('nodester/factories/responses/html');
// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class Controller {
	constructor({
		modelFacade,
		queryPreprocessor,
		webResponseFactory,

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
		// TODO: body preprocessor.

		// Extract plural name of model.
		const modelPluralName = model?.options?.name?.plural;
		// Set private name of this controller.
		this.name = `${modelPluralName ?? '_INVALID_NAME_'}Controller`;
		
		// Init standard Web response factory.
		const standardWebResponseFactory = new WebResponseFactory();
		// Set response factory:
		this.createOKResponse = webResponseFactory?.createOKResponse ?? 
														standardWebResponseFactory.createOKResponse.bind(standardWebResponseFactory);
		this.createErrorResponse = webResponseFactory?.createErrorResponse ??
															 standardWebResponseFactory.createErrorResponse.bind(standardWebResponseFactory);
	}

	// TODO: Implement CRUD.

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
