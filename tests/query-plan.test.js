'use strict';

const {
	describe,
	it,
	expect,
} = require('@jest/globals');
const { Op } = require('sequelize');

const QueryLexer = require('../lib/middlewares/ql/sequelize/interpreter/QueryLexer');
const createPlan = require('../lib/query/plan');
const { createHmacCursorCodec } = require('../lib/query/cursor');

const sequelize = {
	col: (value) => ({ col: value }),
	fn: (fn, col) => ({ fn, col }),
	random: () => 'RANDOM()',
	literal: (value) => ({ literal: value }),
};

const Comment = {
	tableName: 'comments',
	options: { name: { singular: 'Comment', plural: 'Comments' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		post_id: { type: { key: 'INTEGER' }, allowNull: false },
		author_id: { type: { key: 'INTEGER' }, allowNull: false },
		body: { type: { key: 'STRING' }, allowNull: false },
	},
	associations: {},
	sequelize,
};

const Post = {
	tableName: 'posts',
	primaryKeyAttribute: 'id',
	options: { name: { singular: 'Post', plural: 'Posts' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		status: { type: { key: 'STRING' }, allowNull: false },
		published_at: { type: { key: 'DATE' }, allowNull: false },
		title: { type: { key: 'STRING' }, allowNull: false },
	},
	associations: {
		comments: {
			as: 'comments',
			associationType: 'HasMany',
			target: Comment,
			foreignKey: 'post_id',
			sourceKey: 'id',
		},
	},
	sequelize,
};

function filterFor(codec, options = {}) {
	return {
		model: Post,
		attributes: ['id', 'status', 'published_at', 'title'],
		functions: [],
		clauses: ['limit', 'skip', 'order', 'order_by'],
		bounds: { clauses: { limit: { min: 1, max: 20 } } },
		statics: { attributes: {}, clauses: {} },
		includes: {
			comments: {
				model: Comment,
				attributes: ['id', 'post_id', 'author_id', 'body'],
				functions: [],
				clauses: ['limit', 'skip', 'order', 'order_by'],
				bounds: { clauses: {} },
				statics: { attributes: {}, clauses: {} },
				includes: {},
			},
		},
		constraints: {
			where: ({ snapshotTime } = {}) => ({
				status: 'PUBLISHED',
				published_at: { lte: snapshotTime },
			}),
		},
		pagination: {
			mode: 'cursor',
			order: [
				{ field: 'published_at', direction: 'DESC' },
				{ field: 'id', direction: 'DESC' },
			],
			unique: ['id'],
			maxPageSize: 20,
			codec,
		},
		...options,
	};
}

async function ast(query) {
	return new QueryLexer(query).parse();
}

describe('NQL query plan: posts and comments', () => {
	it('builds a bounded multi-column cursor plan and returns page metadata', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const firstAst = await ast('limit=2&attributes=id,title&includes=comments');
		const first = createPlan(firstAst, filter, {
			context: { snapshotTime: '2026-01-01T00:00:00.000Z' },
		});

		expect(first.query.limit).toBe(3);
		expect(first.query.order).toEqual([
			['published_at', 'DESC'],
			['id', 'DESC'],
		]);
		expect(first.query.attributes).toEqual(expect.arrayContaining(['published_at', 'id']));
		expect(first.query.include[0].association).toBe('comments');
		expect(first.query.include[0].separate).toBe(true);
		expect(first.query.subQuery).toBeUndefined();

		const rows = [
			{ id: 9, published_at: new Date('2025-12-03T00:00:00Z') },
			{ id: 8, published_at: new Date('2025-12-03T00:00:00Z') },
			{ id: 7, published_at: new Date('2025-12-02T00:00:00Z') },
		];
		const page = await first.execute({ findAll: async () => rows });
		expect(page.items).toHaveLength(2);
		expect(page.pageInfo.hasNextPage).toBe(true);
		expect(page.pageInfo.nextCursor).toEqual(expect.any(String));

		const decoded = codec.decode(page.pageInfo.nextCursor);
		expect(decoded.values[0]).toEqual({ type: 'date', value: '2025-12-03T00:00:00.000Z' });
		expect(decoded.values[1]).toEqual({ type: 'number', value: 8 });
	});

	it('compiles equal-timestamp cursors as a lexicographic predicate', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const firstAst = await ast('limit=2');
		const first = createPlan(firstAst, filter, { context: { snapshotTime: '2026-01-01' } });
		const page = await first.execute({
			findAll: async () => [
				{ id: 5, published_at: new Date('2025-12-03') },
				{ id: 4, published_at: new Date('2025-12-03') },
				{ id: 3, published_at: new Date('2025-12-03') },
			],
		});

		const secondAst = await ast(`limit=2&after=${page.pageInfo.nextCursor}`);
		const second = createPlan(secondAst, filter, { context: { snapshotTime: '2026-01-01' } });
		const predicate = second.query.where[Op.and].find((entry) => entry[Op.or]);
		expect(predicate[Op.or]).toHaveLength(2);
		expect(predicate[Op.or][0][Op.and][0].published_at[Op.lt]).toBeInstanceOf(Date);
		expect(predicate[Op.or][1][Op.and][0].published_at).toBeInstanceOf(Date);
		expect(predicate[Op.or][1][Op.and][1].id[Op.lt]).toBe(4);
	});

	it('ANDs client predicates with mandatory visibility constraints', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const query = await ast('status=DRAFT');
		const plan = createPlan(query, filter, { context: { snapshotTime: '2026-01-01' } });

		expect(plan.query.where.status).toEqual(['DRAFT']);
		expect(plan.query.where[Op.and]).toEqual(expect.arrayContaining([
			expect.objectContaining({ status: ['DRAFT'] }),
			expect.objectContaining({ status: 'PUBLISHED' }),
		]));
	});

	it('preserves Date values returned by context-dependent constraints', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const snapshotTime = new Date('2026-01-01T00:00:00.000Z');
		const plan = createPlan(await ast('limit=2'), filter, {
			context: { snapshotTime },
		});

		expect(plan.query.where.published_at[Op.lte]).toEqual(snapshotTime);
	});

	it('preserves direct Date constraint values as scalars', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const snapshotTime = new Date('2026-01-01T00:00:00.000Z');
		const filter = filterFor(codec, {
			constraints: {
				where: ({ snapshotTime: contextSnapshot }) => ({
					published_at: contextSnapshot,
				}),
			},
		});
		const plan = createPlan(await ast('limit=2'), filter, {
			context: { snapshotTime },
		});

		expect(plan.query.where.published_at).toEqual(snapshotTime);
	});

	it('preserves symbol-keyed logical constraint predicates', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec, {
			constraints: {
				where: {
					[Op.or]: [
						{ status: 'PUBLISHED' },
						{ status: 'SCHEDULED' },
					],
				},
			},
		});
		const plan = createPlan(await ast('limit=2'), filter);

		expect(plan.query.where[Op.or]).toEqual([
			{ status: 'PUBLISHED' },
			{ status: 'SCHEDULED' },
		]);
	});

	it('keeps legacy predicate access to model columns omitted from the response projection', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec, {
			attributes: ['id', 'title', 'published_at'],
		});
		const plan = createPlan(await ast('status=active'), filter);
		expect(plan.query.where.status).toEqual(['active']);
	});

	it('adds a required comments association even when the client omits it', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec, {
			constraints: {
				includes: {
					comments: {
						required: true,
						where: { author_id: 7 },
					},
				},
			},
		});
		const query = await ast('limit=2');
		const plan = createPlan(query, filter, { context: { snapshotTime: '2026-01-01' } });

		expect(plan.query.include[0]).toMatchObject({
			association: 'comments',
			required: true,
			where: { author_id: 7 },
		});
	});

	it('keeps policy-injected optional includes optional', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec, {
			constraints: {
				includes: {
					comments: { required: false },
				},
			},
		});
		const plan = createPlan(await ast('limit=2'), filter);

		expect(plan.query.include).toHaveLength(1);
		expect(plan.query.include[0].association).toBe('comments');
		expect(plan.query.include[0].required).toBe(false);
	});

	it('rejects malformed or tampered cursors', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const query = await ast('after=not-a-cursor');
		expect(() => createPlan(query, filter, { context: { snapshotTime: '2026-01-01' } }))
			.toThrow(/Invalid cursor/);
	});

	it('allows a nullable cursor field only when the filter declares it non-null', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec, {
			pagination: {
				mode: 'cursor',
				order: [{ field: 'published_at', direction: 'DESC' }],
				nonNull: ['published_at'],
				unique: ['id'],
				maxPageSize: 20,
				codec,
			},
		});
		const previousAllowNull = filter.model.tableAttributes.published_at.allowNull;
		filter.model.tableAttributes.published_at.allowNull = true;
		try {
			const query = await ast('limit=2');
			expect(() => createPlan(query, filter)).not.toThrow();
		}
		finally {
			filter.model.tableAttributes.published_at.allowNull = previousAllowNull;
		}
	});

	it('rejects a cursor when the feed snapshot context changes', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);
		const first = createPlan(await ast('limit=1'), filter, {
			context: { snapshotTime: '2026-01-01' },
		});
		const page = await first.execute({
			findAll: async () => [
				{ id: 1, published_at: new Date('2025-12-02') },
				{ id: 2, published_at: new Date('2025-12-01') },
			],
		});
		const next = await ast(`after=${page.pageInfo.nextCursor}`);
		expect(() => createPlan(next, filter, {
			context: { snapshotTime: '2026-01-02' },
		})).toThrow(/scope/);
	});

	it('rejects unknown fields, operators, and cursor offset combinations', async () => {
		const codec = createHmacCursorCodec('test-only-secret');
		const filter = filterFor(codec);

		expect(() => createPlan(
			{ attributes: [], where: { "title; DROP TABLE posts;--": ['x'] }, includes: [] },
			filter
		)).toThrow(/not present/);
		expect(() => createPlan(
			{ attributes: [], where: { title: { totallyMadeUp: ['x'] } }, includes: [] },
			filter
		)).toThrow(/Invalid operator/);

		const first = createPlan(await ast('limit=2'), filter, { context: { snapshotTime: '2026-01-01' } });
		const page = await first.execute({
			findAll: async () => [
				{ id: 2, published_at: new Date('2025-12-03') },
				{ id: 1, published_at: new Date('2025-12-02') },
			],
		});
		const withSkip = await ast(`limit=2&skip=1&after=${page.pageInfo.nextCursor}`);
		expect(() => createPlan(withSkip, filter, { context: { snapshotTime: '2026-01-01' } }))
			.toThrow(/skip.*cursor/i);
	});
});
