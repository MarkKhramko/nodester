// Test utils.
const {
	describe,
	it,
	expect,
	test
} = require('@jest/globals');

// Parser:
const NodesterQueryParams = require('../lib/middlewares/ql/sequilize');
const parser = require('../lib/middlewares/parser');

describe('nodester Query Language', () => {
	const queryStrings = [
		'created_at>=1.02.2023&includes=comments(fields=id,content&order_by=id&order=desc).user&order_by=id&order=rand&fields=id,title,content'
	];

	it('query 0', () => {
		const queryParams = new NodesterQueryParams(queryString);
		expect(queryParams).toBeDefined();
	});

	
});
