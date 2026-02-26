// Test utils.
const {
	describe,
	it,
	expect
} = require('@jest/globals');

// Parser:
const { ModelsTree } = require('../lib/middlewares/ql/sequelize/interpreter/ModelsTree');
const QueryLexer = require('../lib/middlewares/ql/sequelize/interpreter/QueryLexer');
const traverse = require('../lib/query/traverse');

describe('nodester Clauses', () => {
	describe('Lexer', () => {
		it('supports group_by (single)', async () => {
			const lexer = new QueryLexer('group_by=category_id');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.group_by = 'category_id';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('supports group_by (multiple)', async () => {
			const lexer = new QueryLexer('group_by=category_id,brand_id');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.group_by = ['category_id', 'brand_id'];
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('supports order and order_by', async () => {
			const lexer = new QueryLexer('order_by=created_at&order=desc');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.order_by = 'created_at';
			tree.node.order = 'desc';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('supports limit and skip', async () => {
			const lexer = new QueryLexer('limit=10&skip=20');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.limit = 10;
			tree.node.skip = 20;
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('Traverse', () => {
		const mockModel = {
			options: {
				name: {
					singular: 'Post',
					plural: 'Posts'
				}
			},
			associations: {},
			tableAttributes: {
				id: {},
				title: {},
				category_id: {},
				brand_id: {},
				created_at: {}
			},
			sequelize: {
				col: (col) => ({ col }),
				fn: (fn, col) => ({ fn, col })
			}
		};

		const mockFilter = {
			model: mockModel,
			attributes: ['id', 'title', 'category_id', 'brand_id', 'created_at'],
			functions: {
				count: true
			},
			clauses: ['group_by', 'order', 'order_by', 'limit', 'skip'],
			bounds: {
				clauses: {
					limit: { min: 1, max: 100 },
					skip: { min: 0, max: 1000 }
				}
			},
			statics: { attributes: {}, clauses: {} },
			includes: {}
		};

		it('maps group_by to Sequelize group', () => {
			const queryNode = {
				group_by: 'category_id'
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.group).toBe('category_id');
			expect(result.attributes).toContain('category_id');
		});

		it('maps multiple group_by to Sequelize group array', () => {
			const queryNode = {
				group_by: ['category_id', 'brand_id']
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.group).toEqual(['category_id', 'brand_id']);
			expect(result.attributes).toContain('category_id');
			expect(result.attributes).toContain('brand_id');
		});

		it('maps order and order_by to Sequelize order', () => {
			const queryNode = {
				order: 'desc',
				order_by: 'created_at'
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.order).toEqual([['created_at', 'desc']]);
		});

		it('maps limit and skip to Sequelize limit and offset', () => {
			const queryNode = {
				limit: 10,
				skip: 5
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.limit).toBe(10);
			expect(result.offset).toBe(5);
		});

		it('enforces bounds on limit and skip', () => {
			const queryNode = {
				limit: 500, // max is 100
				skip: -10   // min is 0 (default in _setValueWithBounds)
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.limit).toBe(100);
			expect(result.offset).toBeUndefined(); // _value <= 0 returns continue
		});
	});
});
