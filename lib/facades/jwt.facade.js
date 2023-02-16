// Access to database.
const Sequelize = require('sequelize');
// JWT service.
const JWT = require('nodester/services/jwt.service');
// Utils:
const { lowerCaseFirstLetter } = require('nodester/utils/strings.util');
const { addSeconds } = require('nodester/utils/dates.util');
const Params = require('nodester/facades/FacadeParams');


module.exports = class JWTFacade {
	constructor(
		disabledRefreshToken,
		roleModels=[],
		accessTokenConfigs=null,
		refreshTokenConfigs=null
	) {
		if (!disabledRefreshToken)
			throw new Erroror('"disabledRefreshToken" argument is invalid.');

		this.disabledRefreshToken = disabledRefreshToken;

		this.roleModels = {};
		roleModels.forEach(model => {
			const name = lowerCaseFirstLetter(model?.options?.name?.singular);
			this.roleModels[name] = model;
		});

		this.service = new JWT(accessTokenConfigs, refreshTokenConfigs);
	}

	async login(params) {
		try {
			const {
				email,
				password,
				role
			} = Params(params, {
				email: null,
				password: null,
				role: null
			});

			if (Object.keys(this.roleModels).indexOf(role) === -1)
				throw new Error();

			// Extract model difinition of this type.
			const modelDefinition = this.roleModels[role];
			const instance = await modelDefinition?.findOneByEmail(email);

			if (!instance)
				throw new Error();

			const compareResult = await instance?.comparePasswords(password);

			if (compareResult === false)
				throw new Error();

			const result = {
				role: role,
				[role]: instance.toJSON(),
				tokens: await this.issueTokens({ modelInstance: instance, modelName: role })
			}

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			console.error(error);

			// Unauthorized on any error:
			const err = new Error();
			err.name = 'Unauthorized';
			return Promise.reject(err);
		}
	}

	async issueAccessToken(params) {
		try {
			const {
				parsedRefreshToken,
				modelInstance,
				modelName
			} = Params(params, {
				parsedRefreshToken: null,
				modelInstance: null,
				modelName: null,
			});

			let newAccessToken = null;

			if (!modelName && !parsedRefreshToken.role) {
				const err = new Error('No "modelName" provided for JWT issue.');
				err.name = "ValidationError";
				err.status = 403;
				throw err;
			}

			// If parsed refresh token was provided:
			if (!!parsedRefreshToken) {
				const payload = {
					id: parsedRefreshToken?.id,
					role: parsedRefreshToken.role,
				};
				newAccessToken = await this.service.issueAccessToken(payload);
			}
			// If modelInstance was provided:
			else if (!!modelInstance) {
				const payload = {
					id: modelInstance?.id,
					role: modelName
				};
				newAccessToken = await this.service.issueAccessToken(payload);
			}
			else {
				const err = new Error('No "modelInstance" or "parsedRefreshToken" provided for JWT issue.');
				err.name = "ValidationError";
				err.status = 403;
				throw err;
			}

			// Check if issue was successful.
			if (!newAccessToken) {
				const err = new Error("Could not issue new access token.");
				err.status = 401;
				throw err;
			}

			// Send output.
			return Promise.resolve(newAccessToken);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	async issueTokens(params) {
		try {
			const {
				modelInstance,
				modelName,
				noAccessToken,
				noRefreshToken
			} = Params(params, {
				modelInstance: null,
				modelName: null,
				noAccessToken: false,
				noRefreshToken: false
			});

			// Prepare payload container.
			let payload = {};

			if (!!modelInstance && !!modelName) {
				payload = {
					id: modelInstance?.id,
					role: modelName
				};
			}
			else {
				const err = new Error('No "modelInstance" and "modelName" provided for JWT issue.');
				err.name = "ValidationError";
				err.status = 403;
				throw err;
			}

			const accessToken = await this.service.issueAccessToken(payload);
			const refreshToken = await this.service.issueRefreshToken(payload);

			// Prepare output,
			const tokens = {
				accessToken,
				refreshToken
			};

			if (noAccessToken)
				delete tokens.accessToken;

			if (noRefreshToken)
				delete tokens.refreshToken;
			
			// Send output.
			return Promise.resolve(tokens);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	async refreshAccessToken(params) {
		try {
			const {
				refreshToken,
				parsedRefreshToken
			} = Params(params, {
				refreshToken: null,
				parsedRefreshToken: null
			});

			// Check if token is not blocked:
			const isActive = await this.isRefreshTokenActive({ refreshToken });
			if (!isActive) {
				const err = new Error('Invalid Token!');
				err.name = 'InvalidToken';
				throw err;
			}

			// Issue new access token, based on refresh token:
			const accessToken = await this.issueAccessToken({ parsedRefreshToken });

			// Send output.
			return Promise.resolve(accessToken);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	async isRefreshTokenActive(params) {
		try {
			const {
				refreshToken
			} = Params(params, {
				refreshToken: null
			});

			const foundTokens = await this.disabledRefreshToken.selectAll({ token: refreshToken });

			// Prepare output. Check if provided token was not disabled.
			const isActive = foundTokens.length === 0;

			// Send output.
			return Promise.resolve(isActive);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	async disableRefreshToken(params) {
		try {
			const {
				refreshToken,
				parsedToken
			} = Params(params, {
				refreshToken: null,
				parsedToken: null
			});

			// Unwrap nessessary data.
			const { id, role } = parsedToken;

			// Find or create:
			const cofParams = {
				[`${ role }_id`]: id,
				token: refreshToken
			};
			const [ disabledRefreshToken, created ] = await this.disabledRefreshToken.createOrFind(cofParams);

			// Check result,
			const createdStatus = created === true || !!disabledRefreshToken;

			// Send output.
			const result = {
				status: createdStatus
			}
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
}
