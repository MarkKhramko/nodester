// Format for Role header.
const CLAIMED_ROLE_HEADER_NAME = 'x-claimed-role';
// Reponse protocol generator.
const APIResponseFactory = require('nodester/factories/responses/api');


module.exports = class RoleExtractingPolicy {
	constructor({
		jwtFacade,
		apiResponseFactory,
		name
	}) {
		
		if (!jwtFacade)
			throw new Error('"jwtFacade" argument is invalid.');

		this.jwtFacade = jwtFacade;
		this.name = name ?? 'RoleExtracting';

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
			// Get claimed role.
			const claimedRole = req.header(CLAIMED_ROLE_HEADER_NAME);

			// If claimed role is not set or it's a visitor:
			if (!claimedRole || claimedRole === 'visitor') {
				// Set role as 'visitor'.
				req.user = { role: 'visitor' };

				return Promise.resolve();
			}

			// Unwrap JWT service.
			const jwtService = this.jwtFacade.service;

			try {
				// Get access token either from header, query or body.
				const token = jwtService.extractTokenFromRequest(req);

				// Verifys and parses token. On failed validation will throw error.
				const parsedToken = await jwtService.verifyAccessToken(token);

				// If parsed token's role is not the same as claimed role,
				// immediately throw error:
				if ( parsedToken?.role !== claimedRole ) {
					const err = new Error('Roles do not match');
					err.name = 'RolesMismatch';
					err.details = { message: 'Unauthorized.' }
					err.status = 401;
					return Promise.reject(err);
				}

				// Everything's good, procceed:
				req.token = {
					parsed: parsedToken,
					initial: token
				}

				req.user = { role: parsedToken?.role };
			}
			catch(accessTokenError) {
				// If error is not "NoToken", something bad has happened:
				if (accessTokenError?.name !== 'NoToken') {
					throw accessTokenError;
				}

				// If error is "NoToken":
				//	Set role as 'visitor'.
				req.user = { role: 'visitor' };
			}
			
			return Promise.resolve();
		}
		catch(error) {
			console.error(`${ this.name }.policy error:`, error);

			const statusCode = error?.status ?? 401;

			const err = new Error(error.message);
			err.name = error.name ?? 'UnknownError';
			err.details = { message: 'Unauthorized.' }
			err.status = statusCode;

			return Promise.reject(err);
		}
	}
}
