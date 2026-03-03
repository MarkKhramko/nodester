/**
 * nodester
 * MIT Licensed
 *
 * Tests for query/traverse — exercises a realistic 3-model hierarchy:
 *
 *   Order  ─HasMany─►  Review
 *          ─BelongsTo─► Product
 *
 * All models are plain mock objects; no DB connection is needed.
 */

'use strict';

const {
	describe,
	it,
	expect,
	beforeEach,
} = require('@jest/globals');

const traverse = require('../lib/query/traverse');


// ─── Mock models ────────────────────────────────────────────────────────────

/**
 * Minimal sequelize-like helper used by traverse for ORDER BY and functions.
 */
const mockSequelize = {
	fn: (fn, col) => ({ fn, col }),
	col: (col) => ({ col }),
	literal: (sql) => ({ literal: sql }),
	random: () => 'RANDOM()',
};

const ReviewMock = {
	options: {
		name: {
			singular: 'Review',
			plural: 'Reviews'
		},
	},
	tableAttributes: {
		id: {
			type: { key: 'INTEGER' }
		},
		order_id: {
			type: { key: 'INTEGER' }
		},
		rating: {
			type: { key: 'INTEGER' }
		},
		body: {
			type: { key: 'STRING' }
		},
		created_at: {
			type: { key: 'DATE' }
		},
	},
	associations: {},
	sequelize: mockSequelize,
};

const ProductMock = {
	options: {
		name: { singular: 'Product', plural: 'Products' },
	},
	tableAttributes: {
		id: {
			type: { key: 'INTEGER' }
		},
		title: {
			type: { key: 'STRING' }
		},
		price: {
			type: { key: 'DECIMAL' }
		},
		sku: {
			type: { key: 'STRING' }
		},
	},
	associations: {},
	sequelize: mockSequelize,
};

const OrderMock = {
	options: {
		name: { singular: 'Order', plural: 'Orders' },
	},
	tableAttributes: {
		id: {
			type: { key: 'INTEGER' }
		},
		status: {
			type: { key: 'STRING' }
		},
		total: {
			type: { key: 'DECIMAL' }
		},
		product_id: {
			type: { key: 'INTEGER' }
		},
		created_at: {
			type: { key: 'DATE' }
		},
	},
	associations: {
		reviews: {
			as: 'reviews',
			associationType: 'HasMany',
			target: ReviewMock,
			foreignKey: 'order_id',
			sourceKey: 'id',
		},
		product: {
			as: 'product',
			associationType: 'BelongsTo',
			target: ProductMock,
			foreignKey: 'product_id',
			sourceKey: 'id',
		},
	},
	sequelize: mockSequelize,
};


// ─── Mock filters ──────────────────────────────────────────────────────────

function makeReviewFilter(overrides = {}) {
	return {
		model: ReviewMock,
		attributes: ['id', 'order_id', 'rating', 'body', 'created_at'],
		functions: ['avg', 'count'],
		clauses: ['limit', 'skip', 'order', 'order_by'],
		bounds: { clauses: {} },
		statics: { attributes: {}, clauses: {} },
		includes: {},
		...overrides,
	};
}

function makeProductFilter(overrides = {}) {
	return {
		model: ProductMock,
		attributes: ['id', 'title', 'price', 'sku'],
		functions: [],
		clauses: [],
		bounds: { clauses: {} },
		statics: { attributes: {}, clauses: {} },
		includes: {},
		...overrides,
	};
}

function makeOrderFilter(overrides = {}) {
	return {
		model: OrderMock,
		attributes: ['id', 'status', 'total', 'product_id', 'created_at'],
		functions: ['sum', 'avg', 'count', 'min', 'max'],
		clauses: ['limit', 'skip', 'order', 'order_by', 'group_by'],
		bounds: { clauses: { limit: { min: 1, max: 100 } } },
		statics: { attributes: {}, clauses: {} },
		includes: {
			reviews: makeReviewFilter(),
			product: makeProductFilter(),
		},
		...overrides,
	};
}


// ─── Tests ─────────────────────────────────────────────────────────────────

describe('traverse', () => {

	describe('attributes', () => {

		it('returns all filter attributes when no query attributes are specified', () => {
			const result = traverse({ attributes: [], where: {}, includes: [] }, makeOrderFilter());

			expect(result.attributes).toEqual(
				expect.arrayContaining(['id', 'status', 'total', 'product_id', 'created_at'])
			);
		});

		it('returns only the requested attribute subset', () => {
			const result = traverse(
				{ attributes: ['id', 'status'], where: {}, includes: [] },
				makeOrderFilter()
			);

			expect(result.attributes).toEqual(expect.arrayContaining(['id', 'status']));
			expect(result.attributes).not.toContain('total');
		});

		it('throws when a requested attribute is not in the filter whitelist', () => {
			expect(() =>
				traverse(
					{ attributes: ['secret_field'], where: {}, includes: [] },
					makeOrderFilter()
				)
			).toThrow();
		});
	});


	describe('where', () => {

		it('maps a simple equality condition', () => {
			const result = traverse(
				{ attributes: [], where: { status: ['paid'] }, includes: [] },
				makeOrderFilter()
			);

			expect(result.where).toMatchObject({ status: ['paid'] });
		});

		it('maps an equality condition on a string-like field', () => {
			const result = traverse(
				{ attributes: [], where: { status: { not: ['cancelled'] } }, includes: [] },
				makeOrderFilter()
			);

			// traverse produces a Sequelize Op; just verify the key is present:
			expect(result.where).toHaveProperty('status');
		});

		it('skips where entirely when no conditions are set', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [] },
				makeOrderFilter()
			);

			// traverse removes the where key when empty:
			expect(result).not.toHaveProperty('where');
		});

		it('applies statics.attributes on top of query where', () => {
			const filter = makeOrderFilter({
				statics: { attributes: { status: 'shipped' }, clauses: {} },
			});

			const result = traverse(
				{ attributes: [], where: {}, includes: [] },
				filter
			);

			expect(result.where).toHaveProperty('status');
		});
	});


	describe('clauses', () => {

		it('applies limit within bounds', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [], limit: 10 },
				makeOrderFilter()
			);

			expect(result.limit).toBe(10);
		});

		it('clamps limit to max bound', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [], limit: 9999 },
				makeOrderFilter()
			);

			expect(result.limit).toBe(100); // max is 100
		});

		it('applies skip (offset)', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [], skip: 20 },
				makeOrderFilter()
			);

			expect(result.offset).toBe(20);
		});

		it('applies order asc/desc', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [], order: 'desc', order_by: 'created_at' },
				makeOrderFilter()
			);

			expect(result.order).toEqual([['created_at', 'desc']]);
		});

		it('applies random order', () => {
			const result = traverse(
				{ attributes: [], where: {}, includes: [], order: 'rand' },
				makeOrderFilter()
			);

			expect(result.order).toBe('RANDOM()');
		});
	});


	describe('functions', () => {

		it('allows a whitelisted function (sum)', () => {
			const result = traverse(
				{ functions: [{ fn: 'sum', args: ['total'] }], attributes: [], where: {}, includes: [] },
				makeOrderFilter()
			);

			expect(result.attributes).toContainEqual([
				{ fn: 'SUM', col: { col: 'total' } },
				'total_sum',
			]);
		});

		it('throws for a function not in the whitelist', () => {
			expect(() =>
				traverse(
					{ functions: [{ fn: 'median', args: ['total'] }], attributes: [], where: {}, includes: [] },
					makeOrderFilter()
				)
			).toThrow(/not allowed/);
		});

		it('allows functions defined via array in Filter', () => {
			const filter = makeOrderFilter({
				functions: ['count', 'avg'],
			});

			// count and avg should be allowed, sum should not:
			expect(() =>
				traverse(
					{ functions: [{ fn: 'count', args: ['reviews'] }], attributes: [], where: {}, includes: [] },
					filter
				)
			).not.toThrow();

			expect(() =>
				traverse(
					{ functions: [{ fn: 'sum', args: ['total'] }], attributes: [], where: {}, includes: [] },
					filter
				)
			).toThrow(/not allowed/);
		});
	});


	describe('includes', () => {

		it('includes reviews when requested', () => {
			const result = traverse(
				{
					attributes: [],
					where: {},
					includes: [
						{ model: 'reviews', attributes: [], where: {}, includes: [] }
					]
				},
				makeOrderFilter()
			);

			const reviewInclude = result.include.find(i => i.association === 'reviews');
			expect(reviewInclude).toBeDefined();
		});

		it('includes product when requested', () => {
			const result = traverse(
				{
					attributes: [],
					where: {},
					includes: [
						{ model: 'product', attributes: [], where: {}, includes: [] }
					]
				},
				makeOrderFilter()
			);

			const productInclude = result.include.find(i => i.association === 'product');
			expect(productInclude).toBeDefined();
		});

		it('applies sub-filter attributes on the included model', () => {
			const result = traverse(
				{
					attributes: [],
					where: {},
					includes: [
						{ model: 'product', attributes: ['id', 'title'], where: {}, includes: [] }
					]
				},
				makeOrderFilter()
			);

			const productInclude = result.include.find(i => i.association === 'product');
			expect(productInclude.attributes).toEqual(expect.arrayContaining(['id', 'title']));
			expect(productInclude.attributes).not.toContain('sku');
		});

		it('applies where clause on an included model', () => {
			const result = traverse(
				{
					attributes: [],
					where: {},
					includes: [
						{
							model: 'reviews',
							attributes: [],
							where: { rating: ['5'] },
							includes: []
						}
					]
				},
				makeOrderFilter()
			);

			const reviewInclude = result.include.find(i => i.association === 'reviews');
			expect(reviewInclude.where).toHaveProperty('rating');
		});

		it('throws when requesting an include not in the filter whitelist', () => {
			expect(() =>
				traverse(
					{
						attributes: [],
						where: {},
						includes: [
							{ model: 'unknown_assoc', attributes: [], where: {}, includes: [] }
						]
					},
					makeOrderFilter()
				)
			).toThrow();
		});
	});


	describe('Filter constructor — functions validation', () => {
		const Filter = require('../lib/structures/Filter');

		// A bare-minimum mock model to satisfy Filter's isModel() check.
		const bareModel = {
			tableName: 'orders',
			_schema: {},
			options: { name: { singular: 'Order', plural: 'Orders' } },
			tableAttributes: { id: {} },
			associations: {},
			sequelize: mockSequelize,
		};

		it('accepts an array for functions', () => {
			expect(() => new Filter(bareModel, { functions: ['sum', 'avg'] })).not.toThrow();
		});

		it('throws a TypeError when functions is a plain object', () => {
			expect(() => new Filter(bareModel, { functions: { sum: true } })).toThrow(TypeError);
		});

		it('throws a TypeError when functions is a string', () => {
			expect(() => new Filter(bareModel, { functions: 'sum' })).toThrow(TypeError);
		});

		it('defaults functions to an empty array when not provided', () => {
			const f = new Filter(bareModel, {});
			expect(f.functions).toEqual([]);
		});
	});
});
