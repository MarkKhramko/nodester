// Parser:
const NodesterQueryParams = require('../../lib/queries/NodesterQueryParams');

const queryStrings = [
	'created_at>=1.02.2023&includes=comments(fields=id,content&order_by=id&order=desc).user&order_by=id&order=rand&fields=id,title,content',
	'published=true&includes=comments(fields=id,content,order_by=id).users(fields=name).avatar.image&fields=title,content',
	'published=true&includes=comments(fields=id,content)&fields=title,content',
	'published=true&includes=comments()&fields=title,content',
	'id=5',
];
	

const queryParams = new NodesterQueryParams(queryStrings[0]);

console.log(queryStrings[0], queryParams);
