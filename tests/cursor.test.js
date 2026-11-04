'use strict';

const {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
} = require('@jest/globals');
const { Op, Sequelize, DataTypes } = require('sequelize');

const QueryLexer = require('../lib/middlewares/ql/sequelize/interpreter/QueryLexer');
const Filter = require('../lib/structures/Filter');
const createPlan = require('../lib/query/plan');
const { createHmacCursorCodec } = require('../lib/query/cursor');

const mockSequelize = {
	col: (value) => ({ col: value }),
	fn: (fn, col) => ({ fn, col }),
	random: () => 'RANDOM()',
	literal: (value) => ({ literal: value }),
};

const Author = {
	tableName: 'authors',
	primaryKeyAttribute: 'id',
	options: { name: { singular: 'Author', plural: 'Authors' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		name: { type: { key: 'STRING' }, allowNull: false },
	},
	associations: {},
	sequelize: mockSequelize,
};

const Comment = {
	tableName: 'comments',
	primaryKeyAttribute: 'id',
	options: { name: { singular: 'Comment', plural: 'Comments' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		post_id: { type: { key: 'INTEGER' }, allowNull: false },
		author_id: { type: { key: 'INTEGER' }, allowNull: false },
		body: { type: { key: 'STRING' }, allowNull: false },
	},
	associations: {},
	sequelize: mockSequelize,
};

const Post = {
	tableName: 'posts',
	primaryKeyAttribute: 'id',
	options: { name: { singular: 'Post', plural: 'Posts' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		status: { type: { key: 'STRING' }, allowNull: false },
		published_at: { type: { key: 'DATE' }, allowNull: false },
		score: { type: { key: 'INTEGER' }, allowNull: false },
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
		author: {
			as: 'author',
			associationType: 'BelongsTo',
			target: Author,
			foreignKey: 'author_id',
			targetKey: 'id',
		},
	},
	sequelize: mockSequelize,
};

function cursorFilter(codec, options = {}) {
	return {
		model: Post,
		attributes: ['id', 'status', 'published_at', 'score', 'title'],
		functions: [],
		clauses: ['limit', 'skip', 'order', 'order_by'],
		bounds: { clauses: { limit: { min: 1, max: 3 } } },
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
			author: {
				model: Author,
				attributes: ['id', 'name'],
				functions: [],
				clauses: [],
				bounds: { clauses: {} },
				statics: { attributes: {}, clauses: {} },
				includes: {},
			},
		},
		constraints: {},
		pagination: {
			mode: 'cursor',
			order: [
				{ field: 'published_at', direction: 'DESC' },
				{ field: 'id', direction: 'DESC' },
			],
			unique: ['id'],
			maxPageSize: 3,
			codec,
		},
		...options,
	};
}

async function ast(query) {
	return new QueryLexer(query).parse();
}

function postRows() {
	return [
		{ id: 9, published_at: new Date('2025-12-03T00:00:00.000Z'), score: 4 },
		{ id: 8, published_at: new Date('2025-12-03T00:00:00.000Z'), score: 8 },
		{ id: 7, published_at: new Date('2025-12-02T00:00:00.000Z'), score: 6 },
		{ id: 6, published_at: new Date('2025-12-01T00:00:00.000Z'), score: 2 },
	];
}

describe('NQL cursor pagination', () => {
	it('level 1: parses root cursor clauses', async () => {
		const result = await ast('limit=2&after=opaque_cursor-1_2&attributes=id,title');

		expect(result).toMatchObject({
			limit: 2,
			after: 'opaque_cursor-1_2',
			attributes: ['id', 'title'],
		});
	});

	it('level 2: parses cursor clauses with filters and nested NQL includes', async () => {
		const result = await ast(
			'limit=3&status=like(PUB)&attributes=id,title'
			+ '&includes=comments(author_id=gte(10)&limit=2&order_by=id&order=desc)'
		);

		expect(result.where.status.like).toEqual(['%PUB%']);
		expect(result.includes[0]).toMatchObject({
			model: 'comments',
			where: { author_id: { gte: ['10'] } },
			limit: 2,
			order_by: 'id',
			order: 'desc',
		});
	});

	it('level 3: builds a bounded first page and adds hidden cursor fields', async () => {
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec);
		const plan = createPlan(await ast('limit=99&attributes=id,title'), filter);

		expect(plan.query.limit).toBe(4);
		expect(plan.query.attributes).toEqual(expect.arrayContaining(['id', 'title', 'published_at']));
		expect(plan.query.order).toEqual([
			['published_at', 'DESC'],
			['id', 'DESC'],
		]);

		const page = await plan.execute({ findAll: async () => postRows() });
		expect(page.items.map(row => row.id)).toEqual([9, 8, 7]);
		expect(page.pageInfo).toMatchObject({
			hasNextPage: true,
			hasPreviousPage: false,
			nextCursor: expect.any(String),
			previousCursor: null,
		});
	});

	it('level 4: compiles a lexicographic after predicate for equal sort values', async () => {
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec);
		const first = createPlan(await ast('limit=2'), filter);
		const page = await first.execute({ findAll: async () => postRows() });
		const next = createPlan(await ast(`limit=2&after=${page.pageInfo.nextCursor}`), filter);

		const cursorPredicate = next.query.where[Op.or];
		expect(cursorPredicate).toHaveLength(2);
		expect(cursorPredicate[0][Op.and]).toEqual([
			{ published_at: { [Op.lt]: new Date('2025-12-03T00:00:00.000Z') } },
		]);
		expect(cursorPredicate[1][Op.and][0]).toEqual({
			published_at: new Date('2025-12-03T00:00:00.000Z'),
		});
		expect(cursorPredicate[1][Op.and][1]).toEqual({ id: { [Op.lt]: 8 } });
	});

	it('level 5: supports a before cursor and restores the public order', async () => {
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec);
		const first = createPlan(await ast('limit=2'), filter);
		const page = await first.execute({ findAll: async () => postRows() });
		const previous = createPlan(await ast(`limit=2&before=${page.pageInfo.nextCursor}`), filter);

		expect(previous.query.order).toEqual([
			['published_at', 'ASC'],
			['id', 'ASC'],
		]);
		const result = await previous.execute({
			// The database returns the closest preceding rows in reversed order.
			findAll: async () => [postRows()[0]],
		});
		expect(result.items.map(row => row.id)).toEqual([9]);
		expect(result.pageInfo.hasNextPage).toBe(true);
		expect(result.pageInfo.hasPreviousPage).toBe(false);
	});

	it('level 6: supports mixed-direction composite ordering', async () => {
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec, {
			pagination: {
				mode: 'cursor',
				order: [
					{ field: 'published_at', direction: 'DESC' },
					{ field: 'score', direction: 'ASC' },
					{ field: 'id', direction: 'DESC' },
				],
				unique: ['id'],
				maxPageSize: 3,
				codec,
			},
		});
		const first = createPlan(
			await ast('limit=2&order_by=published_at,score,id&order=desc,asc,desc'),
			filter
		);
		const page = await first.execute({ findAll: async () => postRows() });
		const next = createPlan(await ast(`after=${page.pageInfo.nextCursor}`), filter);

		expect(next.query.order).toEqual([
			['published_at', 'DESC'],
			['score', 'ASC'],
			['id', 'DESC'],
		]);
		const branches = next.query.where[Op.or];
		expect(branches[0][Op.and][0].published_at[Op.lt]).toBeInstanceOf(Date);
		expect(branches[1][Op.and][1].score[Op.gt]).toBe(8);
		expect(branches[2][Op.and][2].id[Op.lt]).toBe(8);
	});

	it('level 7: applies nested required association policies and client NQL together', async () => {
		const Follower = {
			tableName: 'followers',
			primaryKeyAttribute: 'id',
			options: { name: { singular: 'Follower', plural: 'Followers' } },
			tableAttributes: { id: { type: { key: 'INTEGER' }, allowNull: false } },
			associations: {},
			sequelize: mockSequelize,
		};
		const Pub = {
			tableName: 'pubs',
			primaryKeyAttribute: 'id',
			options: { name: { singular: 'Pub', plural: 'Pubs' } },
			tableAttributes: { id: { type: { key: 'INTEGER' }, allowNull: false } },
			associations: {
				followers: {
					as: 'followers',
					associationType: 'BelongsToMany',
					target: Follower,
				},
			},
			sequelize: mockSequelize,
		};
		const FeedPost = {
			...Post,
			tableName: 'feed_posts',
			associations: {
				pub: {
					as: 'pub',
					associationType: 'BelongsTo',
					target: Pub,
				},
			},
		};
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec, {
			model: FeedPost,
			includes: {
				pub: {
					model: Pub,
					attributes: ['id'],
					functions: [],
					clauses: [],
					bounds: { clauses: {} },
					statics: { attributes: {}, clauses: {} },
					includes: { followers: {
						model: Follower,
						attributes: ['id'],
						functions: [],
						clauses: [],
						bounds: { clauses: {} },
						statics: { attributes: {}, clauses: {} },
						includes: {},
					} },
				},
			},
			constraints: {
				includes: {
					pub: {
						required: true,
						includes: {
							followers: {
								required: true,
								where: ({ userId }) => ({ id: userId }),
							},
						},
					},
				},
			},
		});
		const plan = createPlan(
			await ast('limit=2&includes=pub(followers(id=gte(1)))'),
			filter,
			{ context: { userId: 42 } }
		);

		const pubInclude = plan.query.include.find(include => include.association === 'pub');
		const followerInclude = pubInclude.include.find(include => include.association === 'followers');
		expect(pubInclude.required).toBe(true);
		expect(followerInclude.required).toBe(true);
		expect(followerInclude.duplicating).toBe(false);
		expect(followerInclude.where[Op.and]).toEqual(expect.arrayContaining([
			expect.objectContaining({ id: { [Op.gte]: ['1'] } }),
			expect.objectContaining({ id: 42 }),
		]));
	});

	it('level 8: rejects unsafe or incompatible cursor requests', async () => {
		const codec = createHmacCursorCodec('cursor-test-secret');
		const filter = cursorFilter(codec);
		const first = createPlan(await ast('limit=1'), filter);
		const page = await first.execute({ findAll: async () => postRows() });
		const skipAst = await ast(`after=${page.pageInfo.nextCursor}&skip=1`);
		const randomAst = await ast('order=rand');
		const overrideAst = await ast('order_by=title&order=asc');
		const malformedAst = await ast('after=malformed');

		expect(() => createPlan(skipAst, filter))
			.toThrow(/skip.*cursor/i);
		expect(() => createPlan(randomAst, filter))
			.toThrow(/random/i);
		expect(() => createPlan(overrideAst, filter))
			.toThrow(/override/i);
		expect(() => createPlan(malformedAst, filter))
			.toThrow(/Invalid cursor/);

		const nullableFilter = cursorFilter(codec, {
			attributes: [...cursorFilter(codec).attributes, 'nullable_score'],
			model: {
				...Post,
				tableAttributes: {
					...Post.tableAttributes,
					nullable_score: { type: { key: 'INTEGER' }, allowNull: true },
				},
			},
			pagination: {
				mode: 'cursor',
				order: [{ field: 'nullable_score', direction: 'DESC' }],
				codec,
			},
		});
		const nullableAst = await ast('limit=1');
		expect(() => createPlan(nullableAst, nullableFilter))
			.toThrow(/nullable/);
	});
});

describe('NQL cursor pagination with Sequelize execution', () => {
	let sequelize;
	let PostModel;
	let CommentModel;

	beforeEach(async () => {
		sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
		PostModel = sequelize.define('CursorPost', {
			id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
			published_at: { type: DataTypes.DATE, allowNull: false },
			title: { type: DataTypes.STRING, allowNull: false },
		});
		CommentModel = sequelize.define('CursorComment', {
			id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
			post_id: { type: DataTypes.INTEGER, allowNull: false },
			body: { type: DataTypes.STRING, allowNull: false },
		});
		PostModel.hasMany(CommentModel, { as: 'comments', foreignKey: 'post_id' });
		CommentModel.belongsTo(PostModel, { as: 'post', foreignKey: 'post_id' });
		await sequelize.sync({ force: true });
	});

	afterEach(async () => {
		await sequelize.close();
	});

	it('keeps root cursor limits stable with ordered HasMany includes', async () => {
		const [first, second, third] = await PostModel.bulkCreate([
			{ published_at: new Date('2025-01-01'), title: 'first' },
			{ published_at: new Date('2025-01-02'), title: 'second' },
			{ published_at: new Date('2025-01-03'), title: 'third' },
		], { returning: true });
		await CommentModel.bulkCreate([
			{ post_id: third.id, body: 'third-a' },
			{ post_id: third.id, body: 'third-b' },
			{ post_id: first.id, body: 'first-a' },
		]);

		const codec = createHmacCursorCodec('sqlite-cursor-secret');
		const commentFilter = new Filter(CommentModel, {
			attributes: ['id', 'post_id', 'body'],
			clauses: ['limit', 'skip', 'order', 'order_by'],
		});
		const postFilter = new Filter(PostModel, {
			attributes: ['id', 'published_at', 'title'],
			includes: { comments: commentFilter },
			pagination: {
				mode: 'cursor',
				order: [
					{ field: 'published_at', direction: 'DESC' },
					{ field: 'id', direction: 'DESC' },
				],
				unique: ['id'],
				maxPageSize: 2,
				codec,
			},
		});

		const firstPlan = createPlan(await ast('limit=2&includes=comments(order_by=id&order=asc)'), postFilter);
		const firstPage = await firstPlan.execute();
		expect(firstPage.items.map(post => post.id)).toEqual([third.id, second.id]);
		expect(firstPage.items[0].comments.map(comment => comment.body)).toEqual(['third-a', 'third-b']);

		const secondPlan = createPlan(
			await ast(`limit=2&after=${firstPage.pageInfo.nextCursor}&includes=comments(order_by=id&order=asc)`),
			postFilter
		);
		const secondPage = await secondPlan.execute();
		expect(secondPage.items.map(post => post.id)).toEqual([first.id]);
		expect(secondPage.pageInfo.hasNextPage).toBe(false);
	});
});
