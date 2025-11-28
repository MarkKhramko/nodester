/*
 * Add all your custom errors in this file.
 */
const Err = require('./CustomError');
const {
	AuthError,
	TokenVersionMismatchError,
	RefreshTokenRevokedError,
	RefreshTokenExpiredError,
	AccessTokenExpiredError,
	InvalidCredentialsError,
	InvalidTokenError
} = require('./AuthError');


module.exports = {
	Err,
	AuthError,
	TokenVersionMismatchError,
	RefreshTokenRevokedError,
	RefreshTokenExpiredError,
	AccessTokenExpiredError,
	InvalidCredentialsError,
	InvalidTokenError
}
