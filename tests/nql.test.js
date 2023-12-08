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
			// All possible params.
			'id=10&position=4&limit=3&skip=10&order=desc&order_by=index&fields=id,content,position,created_at',
		];

		it('Simple where', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['10'] });
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('All possible params', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['10'], position: ['4'] });
			tree.node.fields = [ 'id', 'content', 'position', 'created_at' ];
			tree.node.limit = 3;
			tree.node.skip = 10;
			tree.node.order = 'desc';
			tree.node.order_by = 'index';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});
	});

	describe('includes', () => {
		const queryStrings = [
			// Simple includes.
			'includes=comments&id=7',
			// Include with All possible params.
			'includes=comments(id=10&position=4&limit=3&skip=10&order=desc&order_by=index&fields=id,content,position)',

			// 2 horizontals
			'includes=comments,users&id=1000',
			
			// Horizontals queried.
			'includes=comments(order=desc),users,likes(order=rand),reposts&id=1000',
			// Horizontals queried №2.
			'in=reactions,comments(user_id=gte(4)&skip=10&limit=2).users,likes,reposts',

			// Separated includes.
			'includes=comments(order=rand)&id=7&limit=3&includes=users(fields=id,content)',
		];

		test('Simple includes', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['7'] });
			tree.include('comments');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Include with all possible params', () => {
			const lexer = new QueryLexer( queryStrings[1] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.include('comments').use('comments');
			tree.node.addWhere({ id: ['10'], position: ['4'] });
			tree.node.fields = [ 'id', 'content', 'position' ];
			tree.node.limit = 3;
			tree.node.skip = 10;
			tree.node.order = 'desc';
			tree.node.order_by = 'index';
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('2 horizontals', () => {
			const lexer = new QueryLexer( queryStrings[2] );
			const result = lexer.query;


			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['1000'] });
			tree.include('comments');
			tree.include('users');
			const expected = tree.root.toObject();

			expect(result).toMatchObject(expected);
		});

		test('Horizontals queried', () => {
			const lexer = new QueryLexer( queryStrings[3] );
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
			const lexer = new QueryLexer( queryStrings[4] );
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
			const lexer = new QueryLexer( queryStrings[5] );
			const result = lexer.query;

			const tree = new ModelsTree();
			tree.node.addWhere({ id: ['7'] });
			tree.node.limit = 3;
			tree.include('comments').use('comments');
			tree.node.order = 'rand';
			tree.up();
			tree.include('users').use('users');
			tree.node.fields = [ 'id', 'content' ];
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
		];

		test('"IN" simple', () => {
			const lexer = new QueryLexer( queryStrings[0] );
			const result = lexer.query;

			const tree = new ModelsTree();
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
});
