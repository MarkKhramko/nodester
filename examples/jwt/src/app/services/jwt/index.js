const JWT_CONFIGS = require('#configs/jwt');

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
	AccessTokenExpiredError,
	InvalidTokenError,
	TokenVersionMismatchError
} = require('#factories/errors');


module.exports = {
	verifyKeys: _verifyKeys,

	sign: _sign,
	verify: _verify,
	decode: _decode,

	getJWKS: _getJWKS,
	getAccessTokenLifetime: _getAccessTokenLifetime
}

function _verifyKeys() {
	// Verify keys are valid
	try {
		const testPayload = { test: true };
		const testToken = _sign(testPayload);
		_verify(testToken);
	} catch (error) {
		throw new Error(`Invalid JWT keys: ${error.message}`);
	}
}

/**
 * Sign a JWT access token
 * @param {Object} payload - Token payload
 * @param {string} payload.sub - User ID
 * @param {number} payload.ver - Token version
 * @param {string} [payload.jti] - JWT ID (optional)
 * @param {string|Array} [payload.scp] - Scope (optional)
 * @returns {string} Signed JWT token
 */
function _sign(payload) {
	const now = Math.floor(Date.now() / 1000);
	const jti = payload.jti || crypto.randomUUID();

	const tokenPayload = {
		sub: payload.sub,
		ver: payload.ver,
		iat: now,
		exp: now + JWT_CONFIGS.ACCESS_TOKEN_LIFETIME,
		aud: JWT_CONFIGS.AUDIENCE,
		iss: JWT_CONFIGS.ISSUER,
		jti: jti,
		...(payload.scp && { scp: payload.scp })
	};

	const privateKey = JWT_CONFIGS.PRIVATE_KEY;
	const token = jwt.sign(tokenPayload, privateKey, {
		algorithm: 'RS256',
		keyid: JWT_CONFIGS.KID
	});

	return token;
}

/**
 * Verify and decode a JWT access token
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @param {number} options.expectedVersion - Expected token version
 * @returns {Object} Decoded token payload
 * @throws {InvalidTokenError|AccessTokenExpiredError|TokenVersionMismatchError}
 */
function _verify(token, options = {}) {
	try {
		const decoded = jwt.verify(token, JWT_CONFIGS.PUBLIC_KEY, {
			algorithms: ['RS256'],
			issuer: JWT_CONFIGS.ISSUER,
			audience: JWT_CONFIGS.AUDIENCE
		});

		// Check token version if provided
		if (options.expectedVersion !== undefined) {
			if (decoded.ver !== options.expectedVersion) {
				throw new TokenVersionMismatchError();
			}
		}

		return decoded;
	} catch (error) {
		if (error instanceof TokenVersionMismatchError) {
			throw error;
		}
		if (error.name === 'TokenExpiredError') {
			throw new AccessTokenExpiredError();
		}
		if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
			throw new InvalidTokenError(error.message);
		}
		throw new InvalidTokenError('Token verification failed');
	}
}

/**
 * Decode token without verification (for inspection only)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload (unverified)
 */
function _decode(token) {
	return jwt.decode(token, { complete: true });
}

/**
 * Get JWKS (JSON Web Key Set) for public key distribution
 * @returns {Object} JWKS object
 */
function _getJWKS() {
	const publicKeyObj = crypto.createPublicKey(JWT_CONFIGS.PUBLIC_KEY);
	const jwk = publicKeyObj.export({ format: 'jwk' });

	const set = {
		kty: jwk.kty,
		use: 'sig',
		kid: JWT_CONFIGS.KID,
		alg: 'RS256',
		n: jwk.n,
		e: jwk.e
	}

	return {
		keys: [ set ]
	};
}

/**
 * Get access token lifetime in seconds
 * @returns {number} Lifetime in seconds
 */
function _getAccessTokenLifetime() {
	return JWT_CONFIGS.ACCESS_TOKEN_LIFETIME;
}