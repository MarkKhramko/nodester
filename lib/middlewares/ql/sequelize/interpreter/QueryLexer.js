/*!
 * /nodester
 * MIT Licensed
 */
'use strict';


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

const FN_TOKENS = new Enum({
	COUNT: 'count',
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

		this.parseIsolatedQuery(decoded, 0, this.tree);

		return this.tree.root;
	}

	parseIsolatedQuery(queryString='', startAt=0, tree) {
		const isSubQuery = tree.node.model !== 'root';
		debug({ isSubQuery, startAt });

		// Token is accumulated char-by-char.
		let token = '';
		// Value of param ('id=10' OR 'fields=id,text').
		let value = [];
		// Model, that was active before cursor went up in the tree.
		let previousActive = null;

		for (let i=startAt; i < queryString.length; i++) {
			const char = queryString[i];

			// ( can mean params of OP token,
			// or subquery of a model:
			if (char === '(') {
				debug('char', char, { token, node: tree.node });

				// If OP token:
				if (OP_TOKENS.asArray.indexOf(token) > -1) {
					// Set operation token.
					tree.node.op = this.parseOP(token);
					token = '';
					continue;
				}
				
				// If FN token:
				if (FN_TOKENS.asArray.indexOf(token) > -1) {
					// Set function token.
					tree.node.fn = token;
					token = '';
					continue;
				}

				// If model subquery:
				const model = token;
				tree.use(model) ?? tree.include(model).use(model);
				token = '';

				// Process subquery:
				i++;
				const [ charsCount ] = this.parseIsolatedQuery(queryString, i, tree);
				i += charsCount;

				previousActive = model;
				tree.up();

				continue;
			}

			// ) can mean end of OP token params,
			// or end of subquery:
			if (char === ')') {
				debug('char', char, { token, node: tree.node });

				// If end of OP token:
				if (!!tree.node.op) {

					// If token is empty, error:
					if (token === '') {
						const err = UnexpectedCharError(i, char);
						throw err;
					}

					// Structure of a value depends on OP:
					let fullOp = {};
					switch (tree.node.op) {
						case 'not':
						case 'like':
							fullOp = { [tree.node.activeParam]: { [tree.node.op]: [token] } };
							break;
						default:
							value.push({ [tree.node.activeParam]: [token] });
							fullOp = { [tree.node.op]: value };
							break;
					}

					tree.node.addWhere(fullOp);

					// Reset:
					tree.node.resetOP();
					tree.node.activeParam = 'includes';
					token = '';
					value = [];
					continue;
				}

				// If end of FN token:
				if (!!tree.node.fn) {
					// If token is empty, error:
					if (token === '') {
						const err = UnexpectedCharError(i, char);
						throw err;
					}

					let fnParams = {};
					switch (tree.node.fn) {
						case 'count':
							fnParams = {
								fn: 'count',
								args: [token]
							};
							break;
						default:
							fnParams = {
								fn: [tree.node.fn],
								args: [token]
							};
							break;
					}

					tree.node.addFunction(fnParams);

					// Reset:
					tree.node.resetFN();
					tree.node.activeParam = 'includes';
					token = '';
					value = [];
					continue;
				}

				// If end of subquery:
				if (!!tree.node.activeParam && tree.node.activeParam !== 'includes') {
					// Set value.
					this.setNodeParam(tree.node, token, value);
					// Reset:
					tree.node.resetActiveParam();
					tree.node.resetOP();
				}
				const numberOfProcessedChars = i - startAt;
				return [ numberOfProcessedChars ];
			}

			// , can mean n-th value in value array,
			// or horizontal include:
			if (char === ',') {
				debug('char', char, { token, node: tree.node });

				// If OP token:
				if (!!tree.node.op) {
					value.push({
						[tree.node.activeParam]: [token]
					});
					token = '';
					continue;
				}

				// If param value:
				if (tree.node.activeParam !== 'includes') {
					value.push(token);
					token = '';
					continue;
				}

				// Just quit from subquery:
				if (token.length === 0) {
					continue;
				}

				// Horizontal include:
				if (tree.node.activeParam === 'includes') {
					const model = token;
					tree.use(model) ?? tree.include(model);

					token = '';
					continue;
				}

				const err = UnexpectedCharError(i, char);
				throw err;
			}

			// . can mean vertical include
			// or it can be a part of param for "where":
			if (char === '.') {
				debug('char', char, { token, node: tree.node });

				// Vertical include:
				if (!!previousActive) {
					tree.use(previousActive);
					tree.node.activeParam = 'includes';
					token = '';
					continue;
				}

				// If include of new model:
				if (token.length > 0) {
					const model = token;
					tree.use(model) ?? tree.include(model).use(model);

					// Prepare for more includes:
					tree.node.activeParam = 'includes';

					token = '';
					continue;
				}

				const err = UnexpectedCharError(i, char);
				throw err;
			}

			// + can only mean horizontal include:
			if (char === '+') {
				debug('char', char, { token, node: tree.node });

				// If include of new model:
				if (token.length > 0) {
					const model = token;
					// Include, but do not use:
					tree.use(model) ?? tree.include(model).use(model);
					tree.up();

					// Prepare for more includes:
					tree.node.activeParam = 'includes';

					token = '';
					continue;
				}

				if (tree.node.hasParent === false) {
					const err = UnexpectedCharError(i, char);
					throw err;
				}

				tree.up();
				tree.node.activeParam = 'includes';

				continue;
			}

			// & can mean the end of key=value pair,
			// or the end of subincludes:
			if (char === '&') {
				debug('char', char, { token, node: tree.node });

				// If any OP at all:
				if (!!tree.node.op) {
					const err = MissingCharError(i+1, ')');
					throw err;
				}

				// If end of key=value pair:
				if (!!tree.node.activeParam && tree.node.activeParam !== 'includes') {
					// Set value.
					this.setNodeParam(tree.node, token, value);
					// Reset:
					tree.node.resetActiveParam();
					token = '';
					value = [];
					continue;
				}
				else if (tree.node.activeParam === 'includes') {
					// If include of new model:
					if (token.length > 0) {
						const model = token;
						// Just include, no use.
						tree.include(model);
					}

					// Then jump to root.
					tree.upToRoot();

					// Reset:
					token = '';
					value = [];
					continue;	
				}

				// If end of subquery:
				if (tree.node.hasParent === true) {
					tree.up();
					continue;
				}
				// If root:
				else {
					// Reset:
					tree.node.resetActiveParam();
					token = '';
					value = [];
					continue;
				}

				// Unknown case:
				const err = UnexpectedCharError(i, char);
				throw err;
			}
			
			// [ can only mean start of 'in':
			if (char === '[') {
				tree.node.op = 'in';
				continue;
			}

			// ] can only mean end if 'in':
			if (char === ']') {
				// User missed first '[' :
				if (tree.node.op !== 'in') {
					const err = UnexpectedCharError(i, char);
					throw err;
				}

				tree.node.addWhere({
					[tree.node.activeParam]: {
						[tree.node.op]: value
					}
				});
				// Reset:
				tree.node.resetOP();
				value = [];
				token = '';
				continue;
			}
			
			// = can only mean the end of param name:
			if (char === '=') {
				const param = this.parseParamFromToken(token);

				if (isSubQuery === true && param === 'includes') {
					const err = new TypeError(`'include' is forbidden inside subquery (position ${ i }). Use: 'model.model' or 'model.model+model'.`);
					throw err;
				}

				tree.node.activeParam = param;
				token = '';
				continue;
			}

			// Continue accumulating token.
			token += char;
			
			// If last char:
			if (i === queryString.length-1) {
				debug('last char', { token, node: tree.node });
				
				// haven't up from 'in':
				if (tree.node.op === 'in') {
					const err = MissingCharError(i+1, ']');
					throw err;
				}

				// If any OP at all:
				if (!!tree.node.op) {
					const err = MissingCharError(i+1, ')');
					throw err;
				}

				this.setNodeParam(tree.node, token, value);

				// If end of subquery:
				if (isSubQuery === true) {
					const numberOfProcessedChars = i+1 - startAt;
					return [ numberOfProcessedChars ];
				}
			}
		}

		return [ queryString.length - startAt ];
	}

	parseParamFromToken(token) {
		switch(token) {
			case 'limit':
			case 'l':
				return 'limit';
			case 'skip':
			case 's':
			case 'offset':
				return 'skip';
			case 'order':
			case 'o':
				return 'order';
			case 'order_by':
			case 'o_by':
				return 'order_by';
			case 'fields':
			case 'f':
				return 'fields';
			case 'includes':
			case 'in':
				return 'includes';
			default:
				return token;
		}
	}

	setNodeParam(treeNode, token, value) {
		const param = treeNode.activeParam;

		debug(`set param ${ param }`, { token, value });

		switch(param) {
			case 'limit':
				treeNode.limit = parseInt(token);
				break;
			case 'skip':
			case 'offset':
				treeNode.skip = parseInt(token);
				break;
			case 'order':
				treeNode.order = token;
				break;
			case 'order_by':
				treeNode.order_by = token;
				break;
			case 'fields':
				if (token)
					value.push(token);
				treeNode.fields = value;
				break;
			case 'includes':
				const node = new ModelsTreeNode(token);
				treeNode.include(node);
				break;
			default:
				if (token)
					value.push(token);
				treeNode.addWhere({ [param]: value });
				break;
		}
	}

	parseOP(opToken) {
		switch(opToken) {
			case '|':
			case 'or':
				return 'or';
			case 'not':
			case '!':
				return 'not';
			default:
				return opToken;
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

function MissingCharError(index, char) {
	const err = new TypeError(`Missing ${ char } at position ${ index }`);
	return err;
}
