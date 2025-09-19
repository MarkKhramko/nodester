// Test utils.
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

// Configs.
const PORT = 8100;

const nodester = require('nodester');


describe('nodester application', () => {

	// Init.
	const app = new nodester();
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
