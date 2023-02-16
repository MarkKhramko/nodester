// Boilerplate JWT facade.
const standardJWTFacade = require('nodester/facades/jwt.facade');
// Data extractor:
const Extractor = require('nodester/models/Extractor');
// Reponse protocol generator.
const APIResponseFactory = require('nodester/factories/responses/api');
// Utils:
const { lowerCase } = require('nodester/utils/strings.util');
const Params = require('nodester/utils/params.util');


module.exports = class JWTController {
	constructor({
		jwtFacade,
		apiResponseFactory,
	}) {

		this.facade = jwtFacade ?? standardJWTFacade;
		this.name = 'JWTController';

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
				statusCode = 406;
				errorResponse.details = { message: 'Email or password are incorrect.' };
				break;
			}
			case('ValidationError'): {
				statusCode = 402;
				errorResponse.details = { message: 'Invalid email OR password input.' };
				break;
			}
			case('InvalidToken'): {
				statusCode = 401;
				errorResponse.details = { message: 'Invalid token or token expired.' };
				break;
			}
			case('UserNotFound'): {
				statusCode = 400;
				errorResponse.details = { message: "Such user doesn't exist." };
				break;
			}
			default: {
				errorResponse.details = { message: 'Could not process request.' };
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

	async login(req, res) {
		try {
			// Extract request input:
			const {
				email,
				password,
				role,
			} = Params(req.body, {
				email: null,
				password: null,
				role: 'user',
			});

			if (!email|| !password) {
				// If bad input, throw ValidationError:
				const err = new Error('Invalid email OR password input');
				err.name = 'ValidationError';
				throw err;
			}

			// Lowercase email.
			const _email = lowerCase(email);

			const params = {
				email: _email,
				password,
				role
			};
			const result = await this.facade.login(params);

			// Everything's fine, send response.
			return this.createOKResponse({
				res, 
				content: { ...result }
			});
		}
		catch(error) {
			console.error(`${ this.name }.login error:`, error);
			return this.processError(error, req, res);
		}
	}

	async validate(req, res) {
		try {
			const token = this.facade.service.extractTokenFromRequest(req);

			// Validate token against local seed.
			await this.facade.service.verifyAccessToken(token);

			// Everything's fine, send response.
			return this.createOKResponse({
				res,
				content: {
					isValid: true,
					message: "Valid Token"
				}
			});
		}
		catch(error) {
			console.error("JWTController.validate error: ", error);

			// In any error case, we send token not valid:
			// Create custom error with name InvalidToken.
			const err = new Error('Invalid Token!');
			err.name = 'InvalidToken';
			return this.processError(err, req, res);
		}
	}

	async refresh(req, res) {
		try {
			const refreshToken = this.facade.service.extractRefreshTokenFromRequest(req);

			// Validate token against local seed.
			const parsedToken = await this.facade.service.verifyRefreshToken(refreshToken);

			// Everything's ok, issue new one.
			const accessToken = await this.facade.refreshAccessToken({
																	refreshToken: refreshToken,
																	parsedRefreshToken: parsedToken
																});

			return this.createOKResponse({
				res,
				content: {
					token: accessToken 
				}
			});
		}
		catch(error) {
			console.error(`${ this.name }.refresh error:`, error);

			// In any error case, we send token not valid:
			// Create custom error with name InvalidToken.
			const err = new Error('Invalid Token!');
			err.name = 'InvalidToken';
			return this.processError(err, req, res);
		}
	}

	async disableRefreshToken(req, res) {
		try {
			const refreshToken = this.facade.service.extractRefreshTokenFromRequest(req);

			// Validate refreshToken against local seed.
			const parsedToken = await this.facade.service.verifyRefreshToken(refreshToken);

			const createdStatus = await this.facade.disableRefreshToken({ refreshToken, parsedToken });

			return this.createOKResponse({
				res,
				content: {
					success: createdStatus,
					disabled: createdStatus
				}
			});
		}
		catch(error) {
			console.error(`${ this.name }.disableRefreshToken error:`, error);
			
			// In any error case, we send token not valid:
			// Create custom error with name InvalidToken.
			const err = new Error('Invalid Token!');
			err.name = 'InvalidToken';
			return this.processError(err, req, res);
		}
	}

	async logout(req, res) {
		try {
			const refreshToken = this.facade.service.extractRefreshTokenFromRequest(req);

			if (!refreshToken) {
				const err = new Error('No refreshToken found');
				err.name = 'Unauthorized';
				err.status = 401;
				throw err;
			}

			// Verifys and parses token. On failed validation will throw error.
			const parsedToken = await this.facade.service.verifyRefreshToken(refreshToken);

			// Everything's ok, destroy token.
			const { status } = await this.facade.disableRefreshToken({ refreshToken, parsedToken });

			return this.createOKResponse({
				res, 
				content: {
					status: status,
					loggedIn: status === true
				}
			});
		}
		catch(error) {
			console.error(`${ this.name }.logout error:`, error);
			
			// In any error case, we send token not valid:
			// Create custom error with name InvalidToken.
			const err = new Error('Invalid Token!');
			err.name = 'InvalidToken';
			return this.processError(err, req, res);
		}
	}
}
