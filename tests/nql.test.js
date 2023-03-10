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
		'id=10&position=4&limit=3&order=desc&order_by=index&fields=id,content,position,created_at',
		// Simple includes.
		'includes=comments&id=7',
		
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
		'includes=comments.users.blacks(fields=id,content&order=rand)&id=7&limit=3',
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


	test('query "Subinclude horizontal"', () => {
		const lexer = new QueryLexer( queryStrings[3] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['1000'] });
		tree.include('comments');
		tree.include('users');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Subinclude horizontal (complex)"', () => {
		const lexer = new QueryLexer( queryStrings[4] );
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
		const lexer = new QueryLexer( queryStrings[5] );
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
		const lexer = new QueryLexer( queryStrings[6] );
		const result = lexer.query;


		const tree = new ModelsTree();
		tree.node.addWhere({ id: ['1000'] });
		tree.include('comments').use('comments');
		tree.include('users');
		const expected = tree.root.toObject();

		expect(result).toMatchObject(expected);
	});

	test('query "Subinclude vertical (complex)"', () => {
		const lexer = new QueryLexer( queryStrings[7] );
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

	// test('query 2', () => {
	// 	const lexer = new QueryLexer( queryStrings[2] );
	// 	const result = lexer.query;

	// 	console.log(result);


	// 	const tree = new ModelsTree();
	// 	tree.node.addWhere({ id: ['7'] });
	// 	tree.node.limit = 3;
	// 	tree.include('users') && tree.use('users');
	// 	tree.include('blacks') && tree.use('blacks');
	// 	tree.node.fields = [ 'id', 'content' ];
	// 	tree.node.order = 'rand';
	// 	const expected = tree.root.toObject()

	// 	expect(result).toMatchObject(expected);
	// });

	
});
