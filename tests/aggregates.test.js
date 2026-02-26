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

describe('nodester Aggregates', () => {
	describe('Lexer', () => {
		it('Root model: count()', async () => {
			const lexer = new QueryLexer('fn=count()');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'count',
				args: ['']
			});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Root model: sum(price)', async () => {
			const lexer = new QueryLexer('fn=sum(price)');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'sum',
				args: ['price']
			});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Root model: avg(score)', async () => {
			const lexer = new QueryLexer('fn=avg(score)');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'avg',
				args: ['score']
			});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Root model: min(age), max(age)', async () => {
			const lexer = new QueryLexer('fn=min(age),max(age)');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'min',
				args: ['age']
			});
			tree.node.addFunction({
				fn: 'max',
				args: ['age']
			});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Association: count(comments)', async () => {
			const lexer = new QueryLexer('fn=count(comments)');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'count',
				args: ['comments']
			});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Association: sum(items.price)', async () => {
			const lexer = new QueryLexer('fn=sum(items.price)');
			const result = await lexer.parse();

			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'sum',
				args: ['items.price']
			});
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
			associations: {
				comments: {
					as: 'comments',
					target: { tableName: 'comments' },
					foreignKey: 'post_id',
					sourceKey: 'id'
				}
			},
			tableAttributes: {
				id: {},
				price: {},
				score: {},
				age: {},
				category_id: {},
				brand_id: {}
			},
			sequelize: {
				fn: (fn, col) => ({ fn, col }),
				col: (col) => ({ col }),
				literal: (sql) => ({ literal: sql })
			}
		};

		const mockFilter = {
			model: mockModel,
			attributes: ['id', 'price', 'score', 'age', 'category_id', 'brand_id'],
			functions: {
				count: { target: 'comments' }, // Just to satisfy ensure calls if any
				sum: true,
				avg: true,
				min: true,
				max: true
			},
			clauses: ['group_by'],
			bounds: { clauses: {} },
			statics: { attributes: {}, clauses: {} },
			includes: {
				comments: {
					model: { options: { name: { singular: 'Comment', plural: 'Comments' } }, tableAttributes: { id: {} } },
					attributes: ['id'],
					functions: { count: true, sum: true },
					clauses: [],
					bounds: { clauses: {} },
					statics: { attributes: {}, clauses: {} },
					includes: {}
				}
			}
		};

		it('maps root sum(price)', () => {
			const queryNode = {
				functions: [{ fn: 'sum', args: ['price'] }]
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.attributes).toContainEqual([
				{ fn: 'SUM', col: { col: 'price' } },
				'price_sum'
			]);
		});

		it('maps association count(comments)', () => {
			const queryNode = {
				functions: [{ fn: 'count', args: ['comments'] }]
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.attributes).toContainEqual([
				{ literal: '(SELECT COUNT(*) FROM comments where comments.post_id=Post.id)' },
				'comments_count'
			]);
		});

		it('maps association sum(comments.votes)', () => {
			const queryNode = {
				functions: [{ fn: 'sum', args: ['comments.votes'] }]
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.attributes).toContainEqual([
				{ literal: '(SELECT SUM(votes) FROM comments WHERE comments.post_id=Post.id)' },
				'comments_sum_votes'
			]);
		});

		it('maps root sum(price) with group_by', () => {
			const queryNode = {
				functions: [{ fn: 'sum', args: ['price'] }],
				group_by: 'category_id'
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.group).toBe('category_id');
			expect(result.attributes).toContainEqual([
				{ fn: 'SUM', col: { col: 'price' } },
				'price_sum'
			]);
			// Check if it also includes category_id in attributes
			expect(result.attributes).toContain('category_id');
			// Ensure id is NOT there (default attributes should be excluded)
			expect(result.attributes).not.toContain('id');
		});

		it('maps root sum(price) with multiple group_by', () => {
			const queryNode = {
				functions: [{ fn: 'sum', args: ['price'] }],
				group_by: ['category_id', 'brand_id']
			};
			const result = traverse(queryNode, mockFilter, mockModel);

			expect(result.group).toEqual(['category_id', 'brand_id']);
			expect(result.attributes).toContain('category_id');
			expect(result.attributes).toContain('brand_id');
			expect(result.attributes).toContainEqual([
				{ fn: 'SUM', col: { col: 'price' } },
				'price_sum'
			]);
		});
	});
});
