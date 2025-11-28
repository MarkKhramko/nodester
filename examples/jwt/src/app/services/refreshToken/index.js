const crypto = require('crypto');


/**
 * Refresh Token Service for generation and hashing
 */
class RefreshTokenService {
	/**
	 * Generate a new opaque refresh token
	 * @returns {string} Random opaque token string
	 */
	generate() {
		return crypto.randomBytes(32).toString('hex');
	}

	/**
	 * Hash a refresh token for storage
	 * @param {string} token - Plain refresh token
	 * @returns {string} Hashed token
	 */
	hash(token) {
		return crypto.createHash('sha256').update(token).digest('hex');
	}

	/**
	 * Generate a new JTI (JWT ID) for refresh token
	 * @returns {string} UUID v4
	 */
	generateJTI() {
		return crypto.randomUUID();
	}

	/**
	 * Verify a refresh token against a hash
	 * @param {string} token - Plain refresh token
	 * @param {string} hash - Hashed token
	 * @returns {boolean} True if token matches hash
	 */
	verify(token, hash) {
		const computedHash = this.hash(token);
		return computedHash === hash;
	}
}

// Singleton instance
const refreshTokenService = new RefreshTokenService();

module.exports = refreshTokenService;

