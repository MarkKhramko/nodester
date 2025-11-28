const crypto = require('crypto');
const { InvalidCredentialsError } = require('#factories/errors');


module.exports = {
    hash: _hash,
    verify: _verify,
    verifyOrThrow: _verifyOrThrow
}

/**
 * Hash a password using PBKDF2
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function _hash(password) {
	return new Promise((resolve, reject) => {
		const salt = crypto.randomBytes(32).toString('hex');
		crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
			if (err) {
				return reject(err);
			}
			const hash = derivedKey.toString('hex');
			resolve(`${salt}:${hash}`);
		});
	});
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password (format: salt:hash)
 * @returns {Promise<boolean>} True if password matches
 */
async function _verify(password, hash) {
	return new Promise((resolve, reject) => {
		const [salt, hashValue] = hash.split(':');
		if (!salt || !hashValue) {
			return resolve(false);
		}
		crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
			if (err) {
				return reject(err);
			}
			const computedHash = derivedKey.toString('hex');
			resolve(computedHash === hashValue);
		});
	});
}

/**
 * Verify password and throw error if invalid
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @throws {InvalidCredentialsError} If password doesn't match
 */
async function _verifyOrThrow(password, hash) {
	const isValid = await this.verify(password, hash);
	if (!isValid) {
		throw new InvalidCredentialsError();
	}
}
