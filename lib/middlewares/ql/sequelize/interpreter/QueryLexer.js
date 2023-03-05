const Enum = require('../../../../enums/Enum');
const { ModelsTree, ModelsTreeNode } = require('./ModelsTree');
const util = require('util');
const debug = require('debug')('nodester:interpreter:QueryLexer');

const OP_TOKENS = new Enum({
	AND: 'and',
	BETWEEN: 'between',
	NOT_BETWEEN: 'notBetween',
	BETWEEN_MARK: '~',
	OR: 'or',
	OR_MARK: '|',
	XOR: 'xor',
	NOT: 'not',
	NOT_MARK: '!',
	NOT_IN: 'notIn',
	LIKE: 'like',
	GREATER: 'gt',
	GREATER_OR_EQUAL: 'gte',
	LOWER: 'lt',
	LOWER_OR_EQUAL: 'lte'
});


module.exports = class QueryLexer {
	constructor(queryString='') {
		this.tree = new ModelsTree();
		this.query = !!queryString ?
									this.parse(queryString).toObject()
									:
									{};
	}

	parse(queryString='', tree=this.tree) {
		if (typeof queryString !== 'string') {
			const err = new TypeError(`Invalid 'queryString'.`);
			throw err;
		}

		// You never know if it's encoded or not.
		const decoded = decodeURI(queryString);

		let deep = 0;
		let param = '';
		let token = '';
		let opToken = null;
		let value = [];

		tree = tree ?? new ModelsTree();

		for (let i=0; i < decoded.length; i++) {
			const char = decoded[i];

			if (char === '(') {
				// If not special token,
				// then it's include, so save model:
				if (OP_TOKENS.asArray.indexOf(token) === -1) {
					// It might be a subinclude (with .).
					const model = token.charAt(0) === '.' ? token.slice(1) : token;

					tree.use(model) ?? tree.include(model).use(model);

					param = model;
					token = '';
					deep++;
					continue;
				}
				// If special token:
				else {
					opToken = token;
					token = '';
					continue;
				}
			}

			if (char === ',') {
				// If special token:
				if (!!opToken) {
					value.push(token);
					token = '';
					continue;
				}

				// If root includes, error:
				if (param === 'includes' && token === '') {
					const err = UnexpectedCharError(i, char);
					throw err;
				}

				// If next include:
				const model = token;
				tree.use(model) ?? tree.include(model);
				token = '';
				continue;
			}

			// . can mean deeper include,
			// or parto of param for where:
			if (char === '.') {
				// 
				if (param === 'includes') {
					const model = param = token;
					tree.use(model) ?? tree.include(model).use(model);
					token = '.';
					continue;
				}

				// If it's next subinclude (parent was with subquery),
				// or it's subinclude, but parent was without subquery:
				if (token === '' || param === tree.node.model) {
					token = '.';
					continue;
				}

				// Go into node of param.
				tree.use(param);
				continue;
			}

			if (char === ')') {
				// If special token:
				if (!!opToken) {
					value.push(token);
					opToken = null;

					token = '';
					continue;
				}

				// If empty paranthesis (), error:
				if (token === '' && deep === 0) {
					const err = EmptyQueryError(i, `${ param }()`);
					throw err;
				}

				// If exiting subquery:
				if (token.length > 0) {
					this.setNodeParam(tree.node, param, token, value);
					param = tree.node.model;
				}
				else {
					tree.up();
					param = '';
				}

				token = '';
				value = [];
				deep--;
				continue;
			}

			// & can mean the end of key=value pair
			// or the end of subincludes
			if (char === '&') {
				debug('char', char, { token, param, node: tree.node.model });

				// If end of subinclude:
				if (param.charAt(0) === '.') {
					const model = param.slice(1);
					tree.use(model) ?? tree.include(model);
					continue;
				}

				// If it's included model, but it's query is over:
				if (tree.node.model !== 'root' && deep === 0) {
					tree.upToRoot();
					continue;
				}

				// If it wasn't subinclude:

				//	we might be in 'in' still:
				if (opToken === 'in') {
					const err = MissingCharError(i, ']');
					throw err;
				}

				// If current node query:
				this.setNodeParam(tree.node, param, token, value);
				// Reset:
				opToken = null;
				value = [];
				param = '';
				token = '';
				continue;
			}

			// [ can only mean start of 'in':
			if (char === '[') {
				opToken = 'in';
				continue;
			}

			// ] can only mean end if 'in':
			if (char === ']') {
				// User missed first '[' :
				if (opToken !== 'in') {
					const err = UnexpectedCharError(i, char);
					throw err;
				}

				value.push(token);
				tree.node.addWhere({
					[param]: {
						[opToken]: value
					}
				});
				// Reset:
				opToken = null;
				value = [];
				param = '';
				token = '';
				// Go over next &.
				i++;
				continue;
			}
			
			// = can only mean the end of param name:
			if (char === '=') {
				param = token;
				token = '';
				continue;
			}

			// Continue building token.
			token += char;

			// If last char:
			if (i === decoded.length-1) {
				debug('last char', { token, param, node: tree.node.model });

				// If end of subinclude:
				if (token.charAt(0) === '.') {
					const model = param = token.slice(1);
					tree.use(model) ?? tree.include(model);
					continue;
				}

				// haven't up from includes:
				if (deep > 0) {
					const err = MissingCharError(i+1, ')');
					throw err;
				}

				// haven't up from 'in':
				if (opToken === 'in') {
					const err = MissingCharError(i+1, ']');
					throw err;
				}

				this.setNodeParam(tree.node, param, token, value);
			}
		}

		return tree.root;
	}

	setNodeParam(treeNode, param, token, value) {
		switch(param) {
			case 'limit':
			case 'l':
				treeNode.limit = parseInt(token);
				break;
			case 'skip':
			case 's':
			case 'offset':
				treeNode.skip = parseInt(token);
				break;
			case 'order':
			case 'o':
				treeNode.order = token;
				break;
			case 'order_by':
			case 'o_by':
				treeNode.orderBy = token;
				break;
			case 'fields':
			case 'f':
				treeNode.fields = value.length > 0 ? value : [ token ];
				break;
			case 'includes':
			case 'in':
				const node = new ModelsTreeNode(token);
				treeNode.include(node);
				break;
			default:
				value.push(token);
				treeNode.addWhere({ [param]: value });
				break;
		}
	}

	[util.inspect.custom](depth, opts) {
		return this.tree.root;
	}
}


function UnexpectedCharError(index, char) {
	const err = new TypeError(`Unexpected ${ char } at position ${ index }`);
	return err;
}

function EmptyQueryError(index, description) {
	const err = new TypeError(`Empty query at position ${ index }, ${ description }`);
	return err;
}

function MissingCharError(index, char) {
	const err = new TypeError(`Missing ${ char } at position ${ index }`);
	return err;
}
