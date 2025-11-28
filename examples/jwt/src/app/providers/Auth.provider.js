const JWT_CONFIGS = require('#configs/jwt');

// Models:
const User = require('#models/User');
const RefreshToken = require('#models/RefreshToken');

// Services:
const crypto = require('crypto');
const jwtService = require('#services/jwt');
const PasswordService = require('#services/passwords');
const refreshTokenService = require('#services/refreshToken');

const { withFormattedResponse } = require('#factories/responses');
const {
	InvalidCredentialsError,
	RefreshTokenRevokedError,
	RefreshTokenExpiredError,
	TokenVersionMismatchError,
	InvalidTokenError
} = require('#factories/errors');


/**
 * Auth Provider - Main endpoint for all JWT operations
 */
module.exports = function AuthProvider() {
	withFormattedResponse(this);

	this.issueToken = _issueToken.bind(this);
	this.refreshToken = _refreshToken.bind(this);
	this.revokeToken = _revokeToken.bind(this);
	this.logout = _logout.bind(this);
	this.getJWKS = _getJWKS.bind(this);
}

/**
 * POST /api/v1/auth/token
 * Authenticate user and issue access + refresh tokens
 */
async function _issueToken(req, res) {
	try {
		const {
			email,
			password
		} = req.body;

		if (!email || !password) {
			throw new InvalidCredentialsError('Email and password are required');
		}

		// Find user by email:
		const userWhere = {
			email: email.toLowerCase().trim()
		}
		const user = await User.findOne({
			where: userWhere
		});

		if (!user) {
			throw new InvalidCredentialsError();
		}

		// Verify password
		await PasswordService.verifyOrThrow(password, user.password_hash);

		// Issue access token
		const accessToken = jwtService.sign({
			sub: user.id.toString(),
			ver: user.token_version,
			jti: crypto.randomUUID()
		});

		// Generate refresh token
		const refreshTokenPlain = refreshTokenService.generate();
		const refreshTokenHash = refreshTokenService.hash(refreshTokenPlain);
		const jti = refreshTokenService.generateJTI();

		// Calculate expiration
		const refreshTokenLifetime = JWT_CONFIGS.REFRESH_TOKEN_LIFETIME;
		const expiresAt = new Date(Date.now() + refreshTokenLifetime * 1000);

		// Store refresh token in DB
		await RefreshToken.create({
			user_id: user.id,
			token_hash: refreshTokenHash,
			jti: jti,
			expires_at: expiresAt,
			revoked: false
		});

		const output = {
			access_token: accessToken,
			refresh_token: refreshTokenPlain,
			expires_in: jwtService.getAccessTokenLifetime()
		};

		this.respondOk(res, output);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token (with rotation)
 */
async function _refreshToken(req, res) {
	try {
		const { refresh_token } = req.body;

		if (!refresh_token) {
			throw new InvalidTokenError('Refresh token is required');
		}

		// Hash the provided token
		const tokenHash = refreshTokenService.hash(refresh_token);

		// Find refresh token in DB
		const refreshTokenRecord = await RefreshToken.findOne({
			where: { token_hash: tokenHash },
			include: [{
				model: User,
				as: 'user',
				required: true
			}]
		});

		if (!refreshTokenRecord) {
			throw new InvalidTokenError('Invalid refresh token');
		}

		// Check if revoked
		if (refreshTokenRecord.revoked) {
			// Security: If revoked token is used, revoke all tokens for user (theft detection)
			await _revokeAllUserTokens(refreshTokenRecord.user_id);
			await _bumpTokenVersion(refreshTokenRecord.user_id);
			throw new RefreshTokenRevokedError('Refresh token has been revoked. All tokens invalidated for security.');
		}

		// Check if expired
		if (new Date() > refreshTokenRecord.expires_at) {
			throw new RefreshTokenExpiredError();
		}

		const user = refreshTokenRecord.user;

		// Reload user to get latest token_version
		await user.reload();

		// Note: We don't store version in refresh token, but if user's version changed,
		// it means all tokens were invalidated (password change, global logout, etc.)
		// This is handled implicitly - if version changed, user would need to login again
		// But we should still check if the refresh token was issued before a version bump
		// For simplicity, we assume refresh tokens are valid if they exist and aren't revoked/expired
		// The access token will have the current version embedded

		// Mark old refresh token as revoked (rotation)
		refreshTokenRecord.revoked = true;
		refreshTokenRecord.last_used_at = new Date();
		await refreshTokenRecord.save();

		// Generate new refresh token
		const newRefreshTokenPlain = refreshTokenService.generate();
		const newRefreshTokenHash = refreshTokenService.hash(newRefreshTokenPlain);
		const newJti = refreshTokenService.generateJTI();

		// Calculate expiration
		const refreshTokenLifetime = JWT_CONFIGS.REFRESH_TOKEN_LIFETIME;
		const expiresAt = new Date(Date.now() + refreshTokenLifetime * 1000);

		// Store new refresh token
		await RefreshToken.create({
			user_id: user.id,
			token_hash: newRefreshTokenHash,
			jti: newJti,
			expires_at: expiresAt,
			revoked: false
		});

		// Issue new access token
		const accessToken = jwtService.sign({
			sub: user.id.toString(),
			ver: user.token_version,
			jti: crypto.randomUUID()
		});

		const output = {
			access_token: accessToken,
			refresh_token: newRefreshTokenPlain,
			expires_in: jwtService.getAccessTokenLifetime()
		};

		this.respondOk(res, output);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}

/**
 * POST /api/v1/auth/revoke
 * Revoke a specific refresh token
 */
async function _revokeToken(req, res) {
	try {
		const { refresh_token } = req.body;

		if (!refresh_token) {
			throw new InvalidTokenError('Refresh token is required');
		}

		// Hash the provided token
		const tokenHash = refreshTokenService.hash(refresh_token);

		// Find and revoke refresh token
		const refreshTokenRecord = await RefreshToken.findOne({
			where: { token_hash: tokenHash }
		});

		if (refreshTokenRecord && !refreshTokenRecord.revoked) {
			refreshTokenRecord.revoked = true;
			await refreshTokenRecord.save();
		}

		const output = {
			revoked: true
		};

		this.respondOk(res, output);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}

/**
 * POST /api/v1/auth/logout
 * Revoke all tokens for current user (requires refresh token)
 */
async function _logout(req, res) {
	try {
		const { refresh_token } = req.body;

		if (!refresh_token) {
			throw new InvalidTokenError('Refresh token is required');
		}

		// Hash the provided token
		const tokenHash = refreshTokenService.hash(refresh_token);

		// Find refresh token and get user
		const refreshTokenRecord = await RefreshToken.findOne({
			where: { token_hash: tokenHash },
			include: [{
				model: User,
				as: 'user',
				required: true
			}]
		});

		if (!refreshTokenRecord) {
			throw new InvalidTokenError('Invalid refresh token');
		}

		const userId = refreshTokenRecord.user_id;

		// Revoke all refresh tokens for user
		await _revokeAllUserTokens(userId);

		// Bump token version to invalidate all access tokens
		await _bumpTokenVersion(userId);

		const output = {
			logged_out: true
		};

		this.respondOk(res, output);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}

/**
 * GET /.well-known/jwks.json
 * Get JWKS (JSON Web Key Set) for public key distribution
 */
async function _getJWKS(req, res) {
	try {
		const jwks = jwtService.getJWKS();
		// Return raw JSON for JWKS endpoint (not wrapped in response factory)
		res.status(200);
		res.json(jwks);
	}
	catch(error) {
		this.respondWithError(res, error);
	}
}

/**
 * Helper: Revoke all refresh tokens for a user
 * @private
 */
async function _revokeAllUserTokens(userId) {
	const where = {
		user_id: userId,
		revoked: false
	};
	await RefreshToken.update({ revoked: true }, { where });
}

/**
 * Helper: Bump token version for a user
 * @private
 */
async function _bumpTokenVersion(userId) {
	const user = await User.findByPk(userId);
	if (user) {
		user.token_version = (user.token_version || 0) + 1;
		await user.save();
	}
}
