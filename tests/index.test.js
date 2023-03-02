// Test utils.
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

	test('Application start', () => {
		app.listen(PORT, function() {
			expect(app.port).toBe(PORT);
			expect(app.router._middlewares.isLocked).toBe(true);
			expect(app.router._middlewares.length).toBe(2);

			app.stop();

			expect(app.router._middlewares.length).toBe(0);
			expect(app.router._middlewares.isLocked).toBe(false);
			expect(app.isListening).toBe(false);
		});
	});
});
