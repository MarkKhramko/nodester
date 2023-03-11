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
	const queryStrings = [
		// Simple where.
		'id=10',
		// All possible params.
		'id=10&position=4&limit=3&skip=10&order=desc&order_by=index&fields=id,content,position,created_at',
		// Simple includes.
		'includes=comments&id=7',
		// Include with All possible params.
		'includes=comments(id=10&position=4&limit=3&skip=10&order=desc&order_by=index&fields=id,content,position)',
		
		// Subinclude horizontal.
		'includes=comments,users&id=1000',
		// Subinclude horizontal (more entries).
		'includes=comments(order=desc),users,likes(order=rand),reposts&id=1000',
		// Subinclude horizontal (+ syntaxis).
		'includes=comments(order=desc).users+likes(order=rand&order_by=position)&id=1000',

		// Subinclude vertical.
		'includes=comments.users&id=1000',
		// Subinclude vertical (more entries).
		'in=comments.users.avatars.sizes&position=200',

		// Complex includes.
		'includes=comments.users.avatars(fields=id,content&order=rand)&id=7&limit=3',

		// Broken includes.
		'includes=comments(order=rand)&id=7&limit=3&includes=users(fields=id,content)',

		// OR simple.
		'or(index=2,position=5)',
		// OR shortened.
		'|(index=2,position=5)',

		// NOT inside include.
		'includes=comments(id=not(7))',

		// Like simple.
		'title=like(some_text)',
	];

	it('query "Simple where"', () => {
		const lexer = new QueryLexer( queryStrings[0] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['10'] });
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "All possible params"', () => {
		const lexer = new QueryLexer( queryStrings[1] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['10'], position: ['4'] });
		tree.node.fields = [ 'id', 'content', 'position', 'created_at' ];
		tree.node.limit = 3;
		tree.node.skip = 10;
		tree.node.order = 'desc';
		tree.node.orderBy = 'index';
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Simple includes"', () => {
		const lexer = new QueryLexer( queryStrings[2] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['7'] });
		tree.include('comments');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Include with all possible params"', () => {
		const lexer = new QueryLexer( queryStrings[3] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.include('comments').use('comments');
		tree.node.addWhere({ id: ['10'], position: ['4'] });
		tree.node.fields = [ 'id', 'content', 'position' ];
		tree.node.limit = 3;
		tree.node.skip = 10;
		tree.node.order = 'desc';
		tree.node.orderBy = 'index';
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});


	test('query "Subinclude horizontal"', () => {
		const lexer = new QueryLexer( queryStrings[4] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['1000'] });
		tree.include('comments');
		tree.include('users');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Subinclude horizontal (complex)"', () => {
		const lexer = new QueryLexer( queryStrings[5] );
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


	test('query "Subinclude horizontal (+ syntaxis)"', () => {
		const lexer = new QueryLexer( queryStrings[6] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['1000'] });
		tree.include('comments').use('comments');
		tree.node.order = 'desc';
		tree.include('users');
		tree.include('likes') && tree.use('likes');
		tree.node.order = 'rand';
		tree.node.orderBy = 'position';
		tree.up();
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});


	test('query "Subinclude vertical"', () => {
		const lexer = new QueryLexer( queryStrings[7] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['1000'] });
		tree.include('comments').use('comments');
		tree.include('users');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Subinclude vertical (complex)"', () => {
		const lexer = new QueryLexer( queryStrings[8] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ position: ['200'] });
		tree.include('comments').use('comments');
		tree.include('users').use('users');
		tree.include('avatars').use('avatars');
		tree.include('sizes').use('sizes');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Complex includes"', () => {
		const lexer = new QueryLexer( queryStrings[9] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['7'] });
		tree.node.limit = 3;
		tree.include('comments').use('comments');
		tree.include('users').use('users');
		tree.include('avatars').use('avatars');
		tree.node.fields = [ 'id', 'content' ];
		tree.node.order = 'rand';
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Broken includes"', () => {
		const lexer = new QueryLexer( queryStrings[10] );
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

	test('Token "OR" simple', () => {
		const lexer = new QueryLexer( queryStrings[11] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.node.addWhere({ or: [ { index: ['2'] }, { position: ['5'] } ] });
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('Token "OR" shortened', () => {
		const lexer = new QueryLexer( queryStrings[12] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.node.addWhere({ or: [ { index: ['2'] }, { position: ['5'] } ] });
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('Token "NOT"', () => {
		const lexer = new QueryLexer( queryStrings[13] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.include('comments').use('comments');
		tree.node.addWhere({ id: { not: ['7'] }});
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});
	

	test('Token "Like" simple', () => {
		const lexer = new QueryLexer( queryStrings[14] );
		const result = lexer.query;

		const tree = new ModelsTree();
		tree.node.addWhere({ title: { like: ['some_text'] }});
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});
});
