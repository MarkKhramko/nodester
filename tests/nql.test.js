// Test utils.
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

// Parser:
const { ModelsTree } = require('../lib/middlewares/ql/sequelize/interpreter/ModelsTree');
const QueryLexer = require('../lib/middlewares/ql/sequelize/interpreter/QueryLexer');



describe('nodester Query Language', () => {
	describe('flat', () => {
		const queryStrings = [
			// Simple where.
			'id=10',
			// Only certain attributes.
			'a=id,text',
			// All possible params.
			'id=10&position=4&limit=3&skip=10&order=desc&order_by=index&a=id,content,position,created_at',
		];

		it('Simple where', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['10'] });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		it('Only certain attributes', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.attributes = [ 'id', 'text' ];
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('All possible params', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['10'], position: ['4'] });
			tree.node.attributes = [ 'id', 'content', 'position', 'created_at' ];
			tree.node.limit = 3;
			tree.node.skip = 10;
			tree.node.order = 'desc';
			tree.node.order_by = 'index';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('includes', () => {
		const queryStrings = {
			// Simple includes.
			'simple-includes': 'includes=comments&id=7',
			// Include with params.
			'include-with-params': 'includes=comments(id=10&position=4&limit=3&skip=10&order=desc&order_by=index&a=id,content,position)',

			// 2 horizontals.
			'2-horizontals': 'includes=comments,users&id=1000',
			// 4 horizontals with subquery.
			'4-horizontals': 'in=categories,replies.users,comments(order_by=position&order=desc),users.avatars',
			
			// Horizontals queried.
			'horizontals-queried': 'includes=comments(order=desc),users,likes(order=rand),reposts&id=1000',
			// Horizontals queried №2.
			'horizontals-queried-2': 'in=comments(order_by=index&order=asc).users.karma',
			// Horizontals queried №3.
			'horizontals-queried-3': 'in=reactions,comments(user_id=gte(4)&skip=10&limit=2).users,likes,reposts',
			
			// Separated includes.
			'separated-includes': 'includes=comments(order=rand)&id=7&limit=3&includes=users(a=id,content)',
		};

		test('Simple includes', () => {
			const lexer = new QueryLexer( queryStrings['simple-includes'] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['7'] });
			tree.include('comments');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Include with all possible params', () => {
			const lexer = new QueryLexer( queryStrings['include-with-params'] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.node.addWhere({ id: ['10'], position: ['4'] });
			tree.node.attributes = [ 'id', 'content', 'position' ];
			tree.node.limit = 3;
			tree.node.skip = 10;
			tree.node.order = 'desc';
			tree.node.order_by = 'index';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('2 horizontals', () => {
			const lexer = new QueryLexer( queryStrings['2-horizontals'] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['1000'] });
			tree.include('comments');
			tree.include('users');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('4 horizontals', () => {
			// in=categories,replies.users,comments(order_by=position&order=desc),users.avatars

			const lexer = new QueryLexer( queryStrings['4-horizontals'] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('categories');
			tree.include('replies');
			tree.include('comments');
			tree.include('users');

			tree.use('replies');
			tree.include('users');

			tree.up();

			tree.use('comments');
			tree.node.order = 'desc';
			tree.node.order_by = 'position';

			tree.up();
			tree.use('users');
			tree.include('avatars');

			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Horizontals queried', () => {
			const lexer = new QueryLexer( queryStrings['horizontals-queried'] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['1000'] });
			tree.include('comments').use('comments');
			tree.node.order = 'desc';
			tree.up();
			tree.include('users');
			tree.include('likes') && tree.use('likes');
			tree.node.order = 'rand';
			tree.up();
			tree.include('reposts');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Horizontals queried №2', () => {
			const lexer = new QueryLexer( queryStrings['horizontals-queried-2'] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('comments').use('comments');

			tree.node.order_by = 'index';
			tree.node.order = 'asc';

			tree.include('users') && tree.use('users');
			tree.include('karma');

			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Horizontals queried №3', () => {
			const lexer = new QueryLexer( queryStrings['horizontals-queried-3'] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('reactions');

			tree.include('comments').use('comments');
			tree.node.addWhere({
					user_id: {
						gte: ['4']
					}
			});
			tree.node.skip = 10;
			tree.node.limit = 2;

			tree.include('users');
			tree.up();

			tree.include('likes');
			tree.include('reposts');

			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Separated includes"', () => {
			const lexer = new QueryLexer( queryStrings['separated-includes'] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['7'] });
			tree.node.limit = 3;
			tree.include('comments').use('comments');
			tree.node.order = 'rand';
			tree.up();
			tree.include('users').use('users');
			tree.node.attributes = [ 'id', 'content' ];
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('subincludes', () => {
		const queryStrings = [
			// Simple subinclude.
			'includes=comments.users',

			// Deep subincludes.
			'in=posts.comments.users.avatars.sizes&position=200',

			// Simple horizontal subinclude, "+" syntaxis.
			'includes=comments.users+likes',

			// Subinclude query.
			'includes=comments.users(order=rand&order_by=position)',

			// Complex subincludes query, "+" syntaxis.
			'includes=comments(order=desc).users+likes(order=rand&order_by=position)&id=1000',
		];

		test('Simple subinclude', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.include('users');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Deep subincludes', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('posts').use('posts');
			tree.include('comments').use('comments');
			tree.include('users').use('users');
			tree.include('avatars').use('avatars');
			tree.include('sizes').use('sizes');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Simple horizontal subinclude, "+" syntaxis"', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.include('users');
			tree.include('likes');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Subinclude query', () => {
			const lexer = new QueryLexer( queryStrings[3] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.include('users').use('users');
			tree.node.order = 'rand';
			tree.node.order_by = 'position';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Complex subincludes query, "+" syntaxis', () => {
			const lexer = new QueryLexer( queryStrings[4] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['1000'] });
			tree.include('comments').use('comments');
			tree.node.order = 'desc';
			tree.include('users');
			tree.include('likes') && tree.use('likes');
			tree.node.order = 'rand';
			tree.node.order_by = 'position';
			tree.up();
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('operators:or', () => {
		const queryStrings = [
			// OR simple.
			'or(index=2,position=5)',
			// OR short.
			'|(index=2,position=5)',
		];

		test('"OR" simple', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ or: [ { index: ['2'] }, { position: ['5'] } ] });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"OR" short', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ or: [ { index: ['2'] }, { position: ['5'] } ] });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('operators:not', () => {
		const queryStrings = [
			// Not simple.
			'key=not(main)',
			// Not short.
			'key=!(main)',
			// NOT inside include.
			'includes=comments(id=not(7))'
		];

		test('"NOT" simple', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ key: { not: ['main'] } });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"NOT" short', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ key: { not: ['main'] } });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"NOT" inside includes', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.node.addWhere({ id: { not: ['7'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

	});

	describe('operators:like', () => {
		const queryStrings = [
			// Like simple.
			'title=like(some_text)',

			// Not like simple.
			'title=notLike(some_text)',
			// Not like short.
			'title=!like(some_text)',
		];

		test('"Like" simple', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ title: { like: ['some_text'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"NotLike" simple', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ title: { notLike: ['some_text'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"NotLike" short', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ title: { notLike: ['some_text'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('operators:in', () => {
		const queryStrings = [
			// IN simple.
			'status=[REVIEWED,ANSWERED]',

			// IN and limit clause.
			'status=[REVIEWED,ANSWERED]&limit=3',
		];

		test('"IN" simple', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ status: { in: ['REVIEWED', 'ANSWERED'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('"IN" and "limit" clause', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.limit = 3;
			tree.node.addWhere({ status: { in: ['REVIEWED', 'ANSWERED'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('operators:inequality', () => {
		const queryStrings = [
			// Greater than.
			'created_at=gt(2022)',

			// Greater than or equal to.
			'created_at=gte(2023-12-08)',

			// Lower than.
			'index=lt(10)',

			// Lower than or equal to.
			'index=lte(9)',

			// Greater than in subinclude.
			'in=comments.likes(index=gt(60))'
		];

		test('Greater than', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ created_at: { gt: ['2022'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Greater than or equal to', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ created_at: { gte: ['2023-12-08'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Lower than', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ index: { lt: ['10'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Lower than or equal to', () => {
			const lexer = new QueryLexer( queryStrings[3] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ index: { lte: ['9'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Greater than in subinclude', () => {
			const lexer = new QueryLexer( queryStrings[4] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.include('likes').use('likes');
			tree.node.addWhere({ index: { gt: ['60'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('operators:and', () => {
		const queryStrings = {
			and_simple: 'id=gte(2)&id=lt(5)',
			and_more_op: 'title=like(book)&title=notLike(book #3)&title=notLike(book #4)',
			and_scattered: 'name=like(John)&in=avatar&name=notLike(Drake)'
		}

		test('AND (simple)', () => {
			const lexer = new QueryLexer( queryStrings.and_simple );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ id: { gte: ['2'], lt: ['5'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('AND (more OP)', () => {
			const lexer = new QueryLexer( queryStrings.and_more_op );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ title: { like: ['book'], notLike: ['book #3', 'book #4'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('AND (scattered)', () => {
			const lexer = new QueryLexer( queryStrings.and_scattered );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('avatar');
			tree.node.addWhere({ name: { like: ['John'], notLike: ['Drake'] }});
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});


	describe('functions', () => {
		const queryStrings = {
			count_long: 'functions=count(comments)',
			count_short: 'fn=count(comments)',

			count_and_includes: 'fn=count(comments)&in=comments',
		}

		test('Count (full key name)', () => {
			const lexer = new QueryLexer( queryStrings.count_long );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'count',
				args: ['comments']
			})
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Count (short key name)', () => {
			const lexer = new QueryLexer( queryStrings.count_long );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'count',
				args: ['comments']
			})
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Count and includes', () => {
			const lexer = new QueryLexer( queryStrings.count_and_includes );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addFunction({
				fn: 'count',
				args: ['comments']
			})
			tree.include('comments');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});
});
