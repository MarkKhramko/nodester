// Test utils:
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

// Configs.
const PORT = 8080;

// Our lib.
const Nodester = require('../lib/application');


describe('nodester application', () => {

	// Init.
	const app = new Nodester();
	it('construct', () => {
		expect(app).toBeDefined();
	});

	// app.setDatabase();
	// app.set.database();

	test('listening port', () => {
		app.listen(PORT, function() {
			expect(app.port).toBe(PORT);

			app.stop();
			expect(app.isListening).toBe(false);
		});
	});
});
