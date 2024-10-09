// Test utils.
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

// Configs.
const PORT = 8100;

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
			expect(app.isLocked).toBe(true);
			expect(app.isListening).toBe(true);
			expect(app.middlewaresStack.length).toBe(4);

			app.stop(() => {
				expect(app.isLocked).toBe(false);
				expect(app.isListening).toBe(false);
			});
		});
	});
});
