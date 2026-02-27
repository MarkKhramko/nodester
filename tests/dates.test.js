// Test utils.
const {
	describe,
	it,
	expect
} = require('@jest/globals');

// Component to test:
const { parseValue } = require('../lib/query/traverse/parsers');
const { DataTypes } = require('sequelize');

describe('nodester Date Parsing', () => {
	const mockModel = {
		tableAttributes: {
			created_at: {
				type: { key: DataTypes.DATE.key }
			},
			birthday: {
				type: { key: DataTypes.DATEONLY.key }
			}
		}
	};

	describe('Single value operators (gte, lte, gt, lt)', () => {
		it('should parse ISO date string', () => {
			const raw = { gte: ["2026-02-01T12:00:00Z"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(result[op]).toBeInstanceOf(Date);
			expect(result[op].toISOString()).toBe("2026-02-01T12:00:00.000Z");
		});

		it('should handle space as separator', () => {
			const raw = { gte: ["2026-02-01 12:00:00"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(result[op]).toBeInstanceOf(Date);
			// Result depends on local timezone if no Z, but we check if it's a valid date
			expect(isNaN(result[op].getTime())).toBe(false);
		});

		it('should handle + as separator (URL encoded)', () => {
			const raw = { lte: ["2026-02-01+12:00:00"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(result[op]).toBeInstanceOf(Date);
			expect(isNaN(result[op].getTime())).toBe(false);
		});

		it('should unwrap array for gte', () => {
			const raw = { gte: ["2026-02-01"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(Array.isArray(result[op])).toBe(false);
			expect(result[op]).toBeInstanceOf(Date);
		});
	});

	describe('Multi-value operators (in, between)', () => {
		it('should parse all values in IN operator', () => {
			const raw = { in: ["2026-02-01", "2026-02-02"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(Array.isArray(result[op])).toBe(true);
			expect(result[op][0]).toBeInstanceOf(Date);
			expect(result[op][1]).toBeInstanceOf(Date);
		});

		it('should parse both values in BETWEEN operator', () => {
			const raw = { between: ["2026-01-01", "2026-01-31"] };
			const result = parseValue(raw, 'created_at', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(Array.isArray(result[op])).toBe(true);
			expect(result[op].length).toBe(2);
			expect(result[op][0]).toBeInstanceOf(Date);
		});
	});

	describe('DATEONLY type', () => {
		it('should parse simple date string for DATEONLY', () => {
			const raw = { eq: ["1990-05-15"] };
			const result = parseValue(raw, 'birthday', mockModel);
			const op = Object.getOwnPropertySymbols(result)[0];

			expect(result[op]).toBeInstanceOf(Date);
		});
	});

	describe('Error handling', () => {
		it('should throw descriptive error for invalid date', () => {
			const raw = { gte: ["not-a-date"] };

			expect(() => {
				parseValue(raw, 'created_at', mockModel);
			}).toThrow("nodester: Invalid date value 'not-a-date' for attribute 'created_at'");
		});
	});
});
