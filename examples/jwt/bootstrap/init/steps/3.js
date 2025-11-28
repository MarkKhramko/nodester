/*
 * This bootstrap step generates JWT RSA key pair if they don't exist.
 */
const Path = require('path');
const fsSync = require('fs');
const fs = fsSync.promises;
const { execSync } = require('child_process');


module.exports = {
	run: _run
}

async function _run() {
	console.info('Generating keys...');

	const envPath = Path.join(process.cwd(), '.env');
	const privateKeyPath = Path.join(process.cwd(), 'private.pem');
	const publicKeyPath = Path.join(process.cwd(), 'public.pem');

	// Check if keys already exist in .env (and are not empty/placeholder)
	const envContent = fsSync.existsSync(envPath) 
		? await fs.readFile(envPath, 'utf8')
		: '';

	// Check if keys exist and are not placeholders or empty
	const privateKeyMatch = envContent.match(/JWT_PRIVATE_KEY=["']?([^"'\n]+)["']?/);
	const publicKeyMatch = envContent.match(/JWT_PUBLIC_KEY=["']?([^"'\n]+)["']?/);
	
	const hasPrivateKey = privateKeyMatch && 
		privateKeyMatch[1] && 
		privateKeyMatch[1].trim() !== '' && 
		!privateKeyMatch[1].includes('...') &&
		privateKeyMatch[1].includes('BEGIN');
	
	const hasPublicKey = publicKeyMatch && 
		publicKeyMatch[1] && 
		publicKeyMatch[1].trim() !== '' && 
		!publicKeyMatch[1].includes('...') &&
		publicKeyMatch[1].includes('BEGIN');

	if (hasPrivateKey && hasPublicKey) {
		_logSuccess('JWT keys already exist in .env');
		return Promise.resolve();
	}

	// Check if key files exist
	const privateKeyFileExists = fsSync.existsSync(privateKeyPath);
	const publicKeyFileExists = fsSync.existsSync(publicKeyPath);

	let privateKeyPEM, publicKeyPEM;

	if (privateKeyFileExists && publicKeyFileExists) {
		// Read existing key files
		console.info('Reading existing key files...');
		privateKeyPEM = await fs.readFile(privateKeyPath, 'utf8');
		publicKeyPEM = await fs.readFile(publicKeyPath, 'utf8');
	} else {
		// Generate new key pair
		console.info('Generating new RSA key pair...');
		try {
			// Generate private key
			execSync('openssl genrsa -out private.pem 2048', { stdio: 'inherit' });
			// Generate public key from private key
			execSync('openssl rsa -in private.pem -pubout -out public.pem', { stdio: 'inherit' });
			
			privateKeyPEM = await fs.readFile(privateKeyPath, 'utf8');
			publicKeyPEM = await fs.readFile(publicKeyPath, 'utf8');
			
			console.info('✅ RSA key pair generated');
		} catch (error) {
			console.error('❌ Failed to generate RSA keys:', error.message);
			throw new Error('JWT key generation failed. Make sure OpenSSL is installed.');
		}
	}

	// Format keys for .env file (single line with \n)
	const privateKeyFormatted = privateKeyPEM
		.trim()
		.split('\n')
		.join('\\n');
	const publicKeyFormatted = publicKeyPEM
		.trim()
		.split('\n')
		.join('\\n');

	// Update .env file
	await _updateEnvFile(envPath, privateKeyFormatted, publicKeyFormatted);

	_logSuccess('JWT keys generated and added to .env');
	return Promise.resolve();
}

async function _updateEnvFile(envPath, privateKey, publicKey) {
	let envContent = fsSync.existsSync(envPath) 
		? await fs.readFile(envPath, 'utf8')
		: '';

	// Remove existing JWT configuration section if it exists
	// Match from "# JWT Configuration" to the end of JWT_REFRESH_TOKEN_LIFETIME line
	const jwtSectionRegex = /# JWT Configuration[\s\S]*?JWT_REFRESH_TOKEN_LIFETIME=.*\n?/;
	envContent = envContent.replace(jwtSectionRegex, '');

	// Also remove any orphaned JWT lines that might exist
	envContent = envContent.replace(/JWT_PRIVATE_KEY=.*\n/g, '');
	envContent = envContent.replace(/JWT_PUBLIC_KEY=.*\n/g, '');

	// Clean up multiple consecutive newlines
	envContent = envContent.replace(/\n{3,}/g, '\n\n');

	// Ensure there's a newline at the end
	if (envContent && !envContent.endsWith('\n')) {
		envContent += '\n';
	}

	// Add JWT configuration
	envContent += `# JWT Configuration
JWT_PRIVATE_KEY="${privateKey}"
JWT_PUBLIC_KEY="${publicKey}"
`;

	await fs.writeFile(envPath, envContent, 'utf8');
}

function _logSuccess(message) {
	console.info(`✅ ${message || 'Step 3 completed'}\n`);
}

