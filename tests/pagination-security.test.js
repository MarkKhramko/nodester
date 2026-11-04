'use strict';

const {
	describe,
	it,
	expect,
} = require('@jest/globals');

const QueryLexer = require('../lib/middlewares/ql/sequelize/interpreter/QueryLexer');
const createPlan = require('../lib/query/plan');
const { createHmacCursorCodec } = require('../lib/query/cursor');

const sequelize = {
	col: (value) => ({ col: value }),
	fn: (fn, col) => ({ fn, col }),
	random: () => 'RANDOM()',
	literal: (value) => ({ literal: value }),
};

const Post = {
	tableName: 'posts',
	primaryKeyAttribute: 'id',
	options: { name: { singular: 'Post', plural: 'Posts' } },
	tableAttributes: {
		id: { type: { key: 'INTEGER' }, allowNull: false },
		owner_id: { type: { key: 'INTEGER' }, allowNull: false },
		updated_at: { type: { key: 'DATE' }, allowNull: false },
		title: { type: { key: 'STRING' }, allowNull: false },
	},
	associations: {},
	sequelize,
};

function filterFor(codec) {
	return {
		model: Post,
		attributes: ['id', 'owner_id', 'updated_at', 'title'],
		functions: [],
		clauses: ['limit', 'skip', 'order', 'order_by'],
		bounds: { clauses: { limit: { min: 1, max: 2 } } },
		statics: { attributes: {}, clauses: {} },
		includes: {},
		constraints: {
			where: ({ userId } = {}) => ({ owner_id: userId }),
		},
		pagination: {
			mode: 'cursor',
			order: [
				{ field: 'updated_at', direction: 'DESC' },
				{ field: 'id', direction: 'DESC' },
			],
			unique: ['id'],
			maxPageSize: 2,
			codec,
		},
	};
}

async function ast(query) {
	return new QueryLexer(query).parse();
}

function rows() {
	return [
		{ id: 9, owner_id: 7, updated_at: new Date('2026-01-03T00:00:00.000Z'), title: 'nine' },
		{ id: 8, owner_id: 7, updated_at: new Date('2026-01-02T00:00:00.000Z'), title: 'eight' },
		{ id: 7, owner_id: 7, updated_at: new Date('2026-01-01T00:00:00.000Z'), title: 'seven' },
	];
}

function decodeBody(cursor) {
	const body = cursor.split('.')[0];
	const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
	return JSON.parse(Buffer.from(
		normalized + '='.repeat((4 - normalized.length % 4) % 4),
		'base64'
	).toString('utf8'));
}

function encodeBody(payload) {
	return Buffer.from(JSON.stringify(payload)).toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function tamperPayload(cursor, change) {
	const [body, signature] = cursor.split('.');
	const payload = decodeBody(cursor);
	change(payload);
	return `${encodeBody(payload)}.${signature}`;
}

async function firstPage(codec, userId = 7) {
	const filter = filterFor(codec);
	const plan = createPlan(await ast('limit=2'), filter, { context: { userId } });
	return {
		filter,
		plan,
		page: await plan.execute({ findAll: async () => rows() }),
	};
}

describe('cursor pagination security', () => {
	it('rejects tampered IDs before executing a query', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const { filter, page } = await firstPage(codec);
		const cursor = tamperPayload(page.pageInfo.nextCursor, payload => {
			payload.values[1].value = 999999;
		});
		const query = await ast(`after=${cursor}`);
		const findAll = jest.fn();

		expect(() => createPlan(query, filter, { context: { userId: 7 } }))
			.toThrow(/signature|invalid cursor/i);
		expect(findAll).not.toHaveBeenCalled();
	});

	it('rejects tampered timestamps before executing a query', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const { filter, page } = await firstPage(codec);
		const cursor = tamperPayload(page.pageInfo.nextCursor, payload => {
			payload.values[0].value = '1900-01-01T00:00:00.000Z';
		});
		const query = await ast(`after=${cursor}`);

		expect(() => createPlan(query, filter, { context: { userId: 7 } }))
			.toThrow(/signature|invalid cursor/i);
	});

	it('rejects forged cursors even when the forged payload has valid-looking values', async () => {
		const trusted = createHmacCursorCodec('pagination-secret');
		const attacker = createHmacCursorCodec('attacker-secret');
		const { filter, page } = await firstPage(trusted);
		const forged = decodeBody(page.pageInfo.nextCursor);
		forged.values[1].value = 1;
		const cursor = attacker.encode(forged);
		const query = await ast(`after=${cursor}`);

		expect(() => createPlan(query, filter, { context: { userId: 7 } }))
			.toThrow(/signature|invalid cursor/i);
	});

	it('binds a cursor to the user visibility scope', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const { filter, page } = await firstPage(codec, 7);
		const query = await ast(`after=${page.pageInfo.nextCursor}`);

		expect(() => createPlan(
			query,
			filter,
			{ context: { userId: 8 } }
		)).toThrow(/scope/i);
	});

	it('rejects offset pagination mixed with a cursor', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const { filter, page } = await firstPage(codec);

		for (const offset of ['skip=1', 'skip=999999']) {
			const query = await ast(`after=${page.pageInfo.nextCursor}&${offset}`);
			expect(() => createPlan(
				query,
				filter,
				{ context: { userId: 7 } }
			)).toThrow(/skip.*cursor/i);
		}
	});

	it('clamps oversized limits and never returns more than the configured page size', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const filter = filterFor(codec);
		const plan = createPlan(await ast('limit=999999'), filter, { context: { userId: 7 } });
		const page = await plan.execute({
			findAll: async query => {
				expect(query.limit).toBe(3);
				return rows().concat(rows(), rows());
			},
		});

		expect(page.items).toHaveLength(2);
		expect(page.pageInfo.hasNextPage).toBe(true);
	});

	it('rejects a cursor whose ordering was changed by the client', async () => {
		const codec = createHmacCursorCodec('pagination-secret');
		const { page } = await firstPage(codec);
		const filter = filterFor(codec);
		const query = await ast(`after=${page.pageInfo.nextCursor}&order_by=id&order=asc`);

		expect(() => createPlan(
			query,
			filter,
			{ context: { userId: 7 } }
		)).toThrow(/order|override/i);
	});
});
