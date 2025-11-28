const CustomError = require('./CustomError');


/**
 * Base authentication error
 */
class AuthError extends CustomError {
	constructor(message) {
		super(message);
		this.name = 'Unauthorized';
		this.status = 401;
	}
}

/**
 * Token version mismatch error
 */
class TokenVersionMismatchError extends AuthError {
	constructor(message = 'Token version mismatch') {
		super(message);
		this.code = 'token_version_mismatch';
	}
}

/**
 * Refresh token revoked error
 */
class RefreshTokenRevokedError extends AuthError {
	constructor(message = 'Refresh token has been revoked') {
		super(message);
		this.code = 'refresh_token_revoked';
	}
}

/**
 * Refresh token expired error
 */
class RefreshTokenExpiredError extends AuthError {
	constructor(message = 'Refresh token has expired') {
		super(message);
		this.code = 'refresh_token_expired';
	}
}

/**
 * Access token expired error
 */
class AccessTokenExpiredError extends AuthError {
	constructor(message = 'Access token has expired') {
		super(message);
		this.code = 'access_token_expired';
	}
}

/**
 * Invalid credentials error
 */
class InvalidCredentialsError extends AuthError {
	constructor(message = 'Invalid credentials') {
		super(message);
		this.code = 'invalid_credentials';
	}
}

/**
 * Invalid token error
 */
class InvalidTokenError extends AuthError {
	constructor(message = 'Invalid token') {
		super(message);
		this.code = 'invalid_token';
	}
}

module.exports = {
	AuthError,
	TokenVersionMismatchError,
	RefreshTokenRevokedError,
	RefreshTokenExpiredError,
	AccessTokenExpiredError,
	InvalidCredentialsError,
	InvalidTokenError
};

