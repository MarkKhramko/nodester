require('dotenv').config();

// Models:
const User = require('#models/User');

const {
    hash
} = require('#services/passwords');

module.exports = {
    run: _run
}

async function _run(params) {
    
	console.log('• Seeding: Users');

	// Example: Array of seedable users
	const usersToSeed = [
		{
			email: 'user@example.com',
			password: _generatePassword()
		}
	];

	for (const entry of usersToSeed) {

		const password_hash = await hash(entry.password);

		const [user, created] = await User.findOrCreate({
			where: { email: entry.email },
			defaults: {
				email: entry.email,
				password_hash,
			}
		});

		if (created) {
			console.log(`➡️ Created user: ${entry.email }`);
			console.log(`🔐 Password: ${ entry.password }`);
		} else {
			console.log(`ℹ️ User already exists: ${ entry.email }`);
		}
	}

	console.log('✅ User seeding completed.\n');
}

// Utility to generate a random password
function _generatePassword(length = 12) {
	const chars =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
	let pass = '';
	for (let i = 0; i < length; i++) {
		pass += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return pass;
}
