// Format of token: "Authorization: Bearer [token]".
const ACCESS_TOKEN_NAME = 'Authorization';
const REFRESH_TOKEN_NAME = 'x-refresh-token';
// JWT module.
const jwt = require('jsonwebtoken');
// Utils.
const { addSeconds } = require('nodester/utils/dates.util');


module.exports = class JWTService {
	constructor(
		accessTokenConfigs,
		refreshTokenConfigs
	) {
		if (!accessTokenConfigs || !refreshTokenConfigs){
			throw new Error('"accessTokenConfigs" and "refreshTokenConfigs" are required arguments.');
		}

		this.accessTokenConfigs = { ...accessTokenConfigs };
		this.refreshTokenConfigs = { ...refreshTokenConfigs };
	}

	extractTokenFromRequest(request) {
		let token;

		if (request.header(ACCESS_TOKEN_NAME)) {
			token = this._parseAccessToken(
								request.header(ACCESS_TOKEN_NAME)
							);
		}
		else if (request.cookies[ACCESS_TOKEN_NAME]) {
			token = this._parseAccessToken(
								request.cookies[ACCESS_TOKEN_NAME]
							);
		}
		// Check token in query:
		else if (!!request.query.token) {
			token = request.query.token;
			delete request.body.token;
		}
		// Check token in body:
		else if (!!request.body.token) {
			token = request.body.token;
			delete request.query.token;
		} 
		else {
			const err = new Error(`No ${ACCESS_TOKEN_NAME} was found`);
			err.name = 'NoToken';
			err.details = { message:err.message };
			throw err;
		}

		return token;
	}

	extractRefreshTokenFromRequest(request) {
		let token;

		if (request.header(REFRESH_TOKEN_NAME)) {
			token = request.header(REFRESH_TOKEN_NAME);
		}
		else if (request.cookies[REFRESH_TOKEN_NAME]) {
			token = request.cookies[REFRESH_TOKEN_NAME];
		}
		// Check token in query:
		else if (!!request.query.token) {
			token = request.query.token;
			delete request.body.token;
		}
		// Check token in body:
		else if (!!request.body.token) {
			token = request.body.token;
			delete request.query.token;
		} 
		else {
			const err = new Error(`No ${REFRESH_TOKEN_NAME} was found`);
			err.name = 'NoToken';
			err.details = { message:err.message };
			throw err;
		}

		return token;
	}

	issueAccessToken(payload) {
		const { secret, expiresIn } = this.accessTokenConfigs;
		return this._issueToken({ payload, secret, expiresIn });
	}

	issueRefreshToken(payload) {
		const { secret, expiresIn } = this.refreshTokenConfigs;
		return this._issueToken({ payload, secret, expiresIn });
	}

	verifyAccessToken(token) {
		const { secret } = this.accessTokenConfigs;
		return this._verifyToken({ token, secret });
	}

	verifyRefreshToken(token) {
		const { secret } = this.refreshTokenConfigs;
		return this._verifyToken({ token, secret });
	}

	async _issueToken({ payload, secret, expiresIn }) {
		try {
			const token = jwt.sign(payload, secret, { expiresIn });
			const expirationDateValue = (addSeconds(new Date(), expiresIn/1000)).valueOf();

			const fullToken = { token, expiresIn, expirationDateValue };
			return Promise.resolve(fullToken);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	async _verifyToken({ token, secret }) {
		try {
			const parsedToken = await jwt.verify(token, secret, {});
			return Promise.resolve(parsedToken);
		}
		catch(error) {
			const err = new Error('Invalid signature.');
			err.name = 'ValidationError';
			return Promise.reject(err);
		}
	}

	_parseAccessToken(token) {
		let parsed = '';

		const parts = token.split(' ');

		if (parts.length === 2 && /^Bearer$/.test(parts[0])) {
			parsed = parts[1];
		} 
		else {
			const err = new Error(`Format for ${ACCESS_TOKEN_NAME}: Bearer [token]`);
			err.name = 'InvalidFormat';
			err.details = { message: err.message };
			throw err;
		}

		return parsed;
	}
}
