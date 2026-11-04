/**
 * Tests for request-body extraction and sanitization.
 */

'use strict';

const { Sequelize } = require('sequelize');
const defineModel = require('../lib/models/define');
const Filter = require('../lib/structures/Filter');
const extract = require('../lib/body/extract');

let sequelize;
let Example;
let filter;

beforeEach(async () => {
	sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
	Example = defineModel(sequelize, 'Example', (types) => ({
		integerValue: { type: types.INTEGER, allowNull: true },
		bigIntValue: { type: types.BIGINT, allowNull: true }
	}));
	filter = new Filter(Example);

	await sequelize.sync({ force: true });
});

afterEach(async () => {
	await sequelize.close();
});


describe('body extraction for nullable numeric attributes', () => {
	it('preserves explicit null for INTEGER and BIGINT fields', () => {
		const extracted = extract({ integerValue: null, bigIntValue: null }, filter, Example);

		expect(extracted).toEqual({ integerValue: null, bigIntValue: null });
		expect(JSON.stringify(extracted)).toBe('{"integerValue":null,"bigIntValue":null}');
	});

	it('does not add omitted nullable numeric fields', () => {
		const extracted = extract({}, filter, Example);

		expect(extracted).toEqual({});
		expect(Object.prototype.hasOwnProperty.call(extracted, 'integerValue')).toBe(false);
		expect(Object.prototype.hasOwnProperty.call(extracted, 'bigIntValue')).toBe(false);
	});

	it('sanitizes valid numeric values', () => {
		const extracted = extract({ integerValue: '12', bigIntValue: 34 }, filter, Example);

		expect(extracted).toEqual({ integerValue: 12, bigIntValue: 34 });
	});

	it('preserves null values produced by empty form inputs', () => {
		const extracted = extract({ integerValue: null }, filter, Example);

		expect(extracted).toEqual({ integerValue: null });
	});

	it('clears only the explicitly null field in a partial update', async () => {
		const record = await Example.create({ integerValue: 12, bigIntValue: 34 });
		const data = extract({ integerValue: null }, filter, Example);

		await Example.updateById(record.id, data);
		const updated = await Example.findByPk(record.id);

		expect(updated.integerValue).toBeNull();
		expect(updated.bigIntValue).toBe(34);
	});
});
