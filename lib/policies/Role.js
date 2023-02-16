// Reponse protocol generator.
const APIResponseFactory = require('nodester/factories/responses/api');


module.exports = class RolePolicy {
	constructor({
		roleName,
		jwtFacade,
		apiResponseFactory,
	}) {
		if (!roleName)
			throw new Error('"roleName" argument is invalid.');
		
		if (!jwtFacade)
			throw new Error('"jwtFacade" argument is invalid.');

		this.roleName = roleName;
		this.jwtFacade = jwtFacade;

		// Init standard API response factory.
		const standardAPIResponseFactory = new APIResponseFactory();
		
		// Set response factory:
		this.createOKResponse = apiResponseFactory?.createOKResponse ?? 
														standardAPIResponseFactory.createOKResponse.bind(standardAPIResponseFactory);;
		this.createErrorResponse = apiResponseFactory?.createErrorResponse ??
															 standardAPIResponseFactory.createErrorResponse.bind(standardAPIResponseFactory);;
	}

	async dryRun(req, res, next) {
		try {
			const jwtService = this.jwtFacade.service;

			// Get token either from header, query or body.
			const token = jwtService.extractTokenFromRequest(req);

			// Verifys and parses token. On failed validation will throw error.
			const parsedToken = await jwtService.verifyAccessToken(token);

			// Check role:
			if (parsedToken.role !== this.roleName) {
				const err = new Error(`Unauthorized.`);
				err.name = 'UnauthorizedError';
				err.status = 401;
				throw err;
			}

			// Everything's good, procceed:
			req.token = {
				parsed: parsedToken,
				initial: token
			}
			
			return Promise.resolve();
		}
		catch(error) {
			// If error is not 401
			// or
			// error is not "NoToken",
			// log it:
			if (
				['NoToken', 'UnauthorizedError'].indexOf(error?.name) === -1
			) {
				console.error(`${ this.roleName }.policy error:`, error);
			}

			const statusCode = error?.status ?? 401;

			const err = new Error(error.message);
			err.name = error.name ?? 'UnknownError';
			err.details = { message: 'Unauthorized.' }
			err.status = statusCode;

			return Promise.reject(err);
		}
	}
}
