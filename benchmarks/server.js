'use strict';

const http = require('http');
const bodyParser = require('body-parser');
const { DataTypes, Op, Sequelize } = require('sequelize');
const Filter = require('nodester/filter');
const traverse = require('nodester/query/traverse');
const { NQL_QUERY } = require('./complex-query');

const TARGETS = new Set(['nodester', 'nodester-direct', 'express']);
const SCENARIOS = new Set(['text', 'json', 'params', 'post', 'complex']);

const JSON_BODY = JSON.stringify({
	framework: 'benchmark',
	message: 'hello world',
	items: [1, 2, 3]
});

function isNodesterTarget(target) {
	return target === 'nodester' || target === 'nodester-direct';
}

function parseArgs(argv) {
	const args = {};
	for (let index = 2; index < argv.length; index += 1) {
		const value = argv[index];
		if (!value.startsWith('--')) continue;
		args[value.slice(2)] = argv[index + 1];
		index += 1;
	}
	return args;
}

function setJsonHeaders(res) {
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

async function createDatabase() {
	const sequelize = new Sequelize({
		dialect: 'sqlite',
		storage: ':memory:',
		logging: false,
		pool: {
			max: 1,
			min: 1,
			idle: 0
		}
	});

	const User = sequelize.define('User', {
		name: DataTypes.STRING,
		status: DataTypes.STRING
	}, { timestamps: false });
	const Post = sequelize.define('Post', {
		title: DataTypes.STRING,
		status: DataTypes.STRING,
		score: DataTypes.INTEGER,
		createdAt: DataTypes.INTEGER
	}, { timestamps: false });
	const Comment = sequelize.define('Comment', {
		body: DataTypes.STRING,
		approved: DataTypes.BOOLEAN,
		createdAt: DataTypes.INTEGER
	}, { timestamps: false });

	User.hasMany(Post, { as: 'posts', foreignKey: 'userId' });
	Post.belongsTo(User, { as: 'user', foreignKey: 'userId' });
	Post.hasMany(Comment, { as: 'comments', foreignKey: 'postId' });
	Comment.belongsTo(Post, { as: 'post', foreignKey: 'postId' });

	await sequelize.sync();

	const users = await User.bulkCreate(Array.from({ length: 120 }, (_, index) => ({
		name: `user-${ index + 1 }`,
		status: index % 2 === 0 ? 'active' : 'disabled'
	})));
	const posts = [];
	for (const user of users) {
		for (let index = 0; index < 5; index += 1) {
			posts.push({
				title: `post-${ user.id }-${ index + 1 }`,
				status: index < 4 ? 'published' : 'draft',
				score: 100 - index,
				createdAt: user.id * 10 + index,
				userId: user.id
			});
		}
	}
	const createdPosts = await Post.bulkCreate(posts);
	const comments = [];
	for (const post of createdPosts) {
		for (let index = 0; index < 4; index += 1) {
			comments.push({
				body: `comment-${ post.id }-${ index + 1 }`,
				approved: index < 2,
				createdAt: post.createdAt + index,
				postId: post.id
			});
		}
	}
	await Comment.bulkCreate(comments);

	const filter = new Filter(User, {
		attributes: ['id', 'name', 'status'],
		functions: ['count'],
		bounds: { clauses: { limit: { min: 1, max: 20 } } },
		includes: {
			posts: new Filter(Post, {
				attributes: ['id', 'title', 'score', 'createdAt'],
				bounds: { clauses: { limit: { min: 1, max: 2 } } },
				includes: {
					comments: new Filter(Comment, {
						attributes: ['id', 'body', 'approved'],
						bounds: { clauses: { limit: { min: 1, max: 1 } } }
					})
				}
			})
		}
	});

	return { sequelize, User, Post, Comment, filter };
}

function canonicalizeUsers(rows) {
	return {
		totalUsers: rows.length,
		users: rows.map((user) => ({
			id: user.id,
			name: user.name,
			status: user.status,
			postsCount: user.get('posts_count'),
			posts: user.posts.map((post) => ({
				id: post.id,
				title: post.title,
				score: post.score,
				comments: post.comments.map((comment) => ({
					id: comment.id,
					approved: comment.approved
				}))
			}))
		}))
	};
}

function parseExpressComplexQuery(req) {
	return parseComplexQueryValues(req.query);
}

function parseDirectComplexQuery(req) {
	const query = new URL(req.url, 'http://127.0.0.1').searchParams;
	return parseComplexQueryValues(Object.fromEntries(query.entries()));
}

function parseComplexQueryValues(query) {
	if (
		query.status !== 'active' ||
		query.limit !== '20' ||
		query.order_by !== 'id' ||
		query.order !== 'asc' ||
		query.post_status !== 'published' ||
		query.post_score_gte !== '97' ||
		query.post_limit !== '2' ||
		query.comment_approved !== '1' ||
		query.comment_limit !== '1' ||
		query.include !== 'posts.comments' ||
		query.count !== 'posts'
	) {
		throw new Error('Express query adapter received an unexpected query contract');
	}

	return {
		status: query.status,
		limit: Number(query.limit),
		postStatus: query.post_status,
		postScoreMin: Number(query.post_score_gte),
		postLimit: Number(query.post_limit),
		commentApproved: query.comment_approved === '1',
		commentLimit: Number(query.comment_limit)
	};
}

function assertComplexQueryContract(req) {
	const encodedQuery = req.url.split('?')[1] || '';
	if (decodeURIComponent(encodedQuery) !== NQL_QUERY) {
		throw new Error('Unexpected complex-query benchmark URL');
	}
}

async function runNodesterComplexQuery(req, database) {
	assertComplexQueryContract(req);
	const sequelizeQuery = traverse(req.nquery, database.filter, database.User);
	const rows = await database.User.findAll(sequelizeQuery);
	return canonicalizeUsers(rows);
}

async function runSequelizeComplexQuery(req, database, parseQuery) {
	const query = parseQuery(req);
	const { Comment, Post, User, sequelize } = database;
	const countPosts = sequelize.literal('(SELECT COUNT(*) FROM `Posts` WHERE `Posts`.`userId` = `User`.`id`)');
	const rows = await User.findAll({
		attributes: {
			include: [[countPosts, 'posts_count']]
		},
		where: { status: query.status },
		include: [{
			model: Post,
			as: 'posts',
			attributes: ['id', 'title', 'score', 'createdAt'],
			where: {
				status: query.postStatus,
				score: { [Op.gte]: query.postScoreMin }
			},
			separate: true,
			limit: query.postLimit,
			include: [{
				model: Comment,
				as: 'comments',
				attributes: ['id', 'body', 'approved'],
				where: { approved: query.commentApproved },
				limit: query.commentLimit,
				required: false
			}]
		}],
		order: [['id', 'ASC']],
		limit: query.limit
	});
	return canonicalizeUsers(rows);
}

async function runExpressComplexQuery(req, database) {
	return runSequelizeComplexQuery(req, database, parseExpressComplexQuery);
}

async function runDirectComplexQuery(req, database) {
	return runSequelizeComplexQuery(req, database, parseDirectComplexQuery);
}

async function runComplexQuery(req, target, database) {
	if (target === 'nodester') return runNodesterComplexQuery(req, database);
	if (target === 'nodester-direct') return runDirectComplexQuery(req, database);
	return runExpressComplexQuery(req, database);
}

function configureRoutes(app, target, scenario, database) {
	if (scenario === 'complex') {
		const handler = (req, res, next) => {
			runComplexQuery(req, target, database)
				.then((payload) => {
					setJsonHeaders(res);
					res.end(JSON.stringify(payload));
				})
				.catch(next);
		};

		if (isNodesterTarget(target)) app.add.route('GET /complex-query', handler);
		else app.get('/complex-query', handler);
		return;
	}

	/* existing simple routes follow */

	return configureSimpleRoutes(app, target, scenario);
}

function configureSimpleRoutes(app, target, scenario) {
	if (scenario === 'text') {
		const handler = (_req, res) => {
			res.setHeader('Content-Type', 'text/plain; charset=utf-8');
			res.end('hello world');
		};

		if (isNodesterTarget(target)) app.add.route('GET /text', handler);
		else app.get('/text', handler);
		return;
	}

	if (scenario === 'json') {
		const handler = (_req, res) => {
			setJsonHeaders(res);
			res.end(JSON_BODY);
		};

		if (isNodesterTarget(target)) app.add.route('GET /json', handler);
		else app.get('/json', handler);
		return;
	}

	if (scenario === 'params') {
		const handler = (req, res) => {
			setJsonHeaders(res);
			res.end(JSON.stringify({ id: req.params.id }));
		};

		if (isNodesterTarget(target)) app.add.route('GET /users/:id', handler);
		else app.get('/users/:id', handler);
		return;
	}

	const handler = (req, res) => {
		setJsonHeaders(res);
		res.end(JSON.stringify(req.body));
	};

	if (isNodesterTarget(target)) app.add.route('POST /echo', handler);
	else app.post('/echo', handler);
}

async function startServer(target, scenario, port) {
	let app;
	let server;
	let database;

	if (scenario === 'complex') {
		console.log(`Preparing SQLite/Sequelize dataset for ${ target }`);
		database = await createDatabase();
	}

	if (isNodesterTarget(target)) {
		const Nodester = require('nodester');
		app = new Nodester({
			port,
			// Keep the lean GET tests focused on routing and response handling.
			// The POST scenario adds the same JSON parser used by Express below.
			middlewares: {
				without: scenario === 'complex' && target === 'nodester'
					? ['body-parser', 'cookies']
					: ['nodester-ql', 'body-parser', 'cookies']
			}
		});

		if (scenario === 'post') app.use(bodyParser.json());
		configureRoutes(app, target, scenario, database);
		server = await app.listen(port, '127.0.0.1');
	}
	else {
		const express = require('express');
		app = express();
		if (scenario === 'post') app.use(express.json());
		configureRoutes(app, target, scenario, database);
		server = http.createServer(app);
		await new Promise((resolve, reject) => {
			server.once('error', reject);
			server.listen(port, '127.0.0.1', resolve);
		});
	}
	server.once('error', (error) => {
		console.error(error.stack || error);
		process.exitCode = 1;
	});

	// Make the connection policy explicit so both servers use the same idle
	// keep-alive window instead of depending on framework defaults.
	server.keepAliveTimeout = 5000;
	server.headersTimeout = 6000;
	console.log(`READY ${ target } ${ scenario } ${ port }`);

	const shutdown = () => {
		server.close(async () => {
			if (database) await database.sequelize.close();
			process.exit(0);
		});
	};
	process.once('SIGINT', shutdown);
	process.once('SIGTERM', shutdown);
}

async function main() {
	const args = parseArgs(process.argv);
	const target = args.target;
	const scenario = args.scenario;
	const port = Number(args.port);

	if (!TARGETS.has(target)) throw new Error(`Unknown target: ${ target }`);
	if (!SCENARIOS.has(scenario)) throw new Error(`Unknown scenario: ${ scenario }`);
	if (!Number.isInteger(port) || port < 1) throw new Error(`Invalid port: ${ args.port }`);

	await startServer(target, scenario, port);
}

main().catch((error) => {
	console.error(error.stack || error);
	process.exitCode = 1;
});
