// Test utils.
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

const { decodeQueryString } = require('../lib/middlewares/ql/sequelize/decoder');

describe('decoding', () => {
	describe('utf8mb4', () => {
		const queries = {
			cyrillic: encodeURIComponent(`name=like(книга)`),
			diacritics: encodeURIComponent(`salad=like(šopska)`),
			chinese: encodeURIComponent(`name=like(中)`),
			emoji: encodeURIComponent(`emoji=like(🌸👍)`),
		};

		test('cyrillic', async () => {
			const decoded = decodeQueryString(queries.cyrillic);
			const expected = 'name=like(книга)';

			expect(decoded).toBe(expected);
		});

		test('diacritics', async () => {
			const decoded = decodeQueryString(queries.diacritics);
			const expected = 'salad=like(šopska)';

			expect(decoded).toBe(expected);
		});

		test('chinese', async () => {
			const decoded = decodeQueryString(queries.chinese);
			const expected = 'name=like(中)';

			expect(decoded).toBe(expected);
		});

		test('emoji', async () => {
			const decoded = decodeQueryString(queries.emoji);
			const expected = 'emoji=like(🌸👍)';

			expect(decoded).toBe(expected);
		});
	});
});
