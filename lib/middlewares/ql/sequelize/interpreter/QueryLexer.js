/**
 * nodester
 * MIT Licensed
 */

'use strict';

const Enum = require('nodester/enum');

const { ModelsTree, ModelsTreeNode } = require('./ModelsTree');

const { NodesterQueryError } = require('nodester/errors');

const util = require('util');
const debug = require('debug')('nodester:interpreter:QueryLexer');

const PARAM_TOKENS = new Enum({
	ATTRIBUTES: Symbol('attributes'),

	FUNCTIONS: Symbol('functions'),

	INCLUDES: Symbol('includes'),

	// Clauses:
	GROUP_BY: Symbol('group_by'),
	LIMIT: Symbol('limit'),
	ORDER: Symbol('order'),
	ORDER_BY: Symbol('order_by'),
	SKIP: Symbol('skip'),
	// Clauses\
});

const OP_TOKENS = new Enum({
	AND: 'and',

	BETWEEN: 'between',
	NOT_BETWEEN: 'notBetween',
	BETWEEN_MARK: '~',

	OR: 'or',
	OR_SHORT: '|',
	XOR: 'xor',

	NOT: 'not',
	NOT_SHORT: '!',

	IN: 'in',
	NOT_IN: 'notIn',
	
	LIKE: 'like',
	NOT_LIKE: 'notLike',
	NOT_LIKE_SHORT: '!like',
	
	GREATER: 'gt',
	GREATER_OR_EQUAL: 'gte',
	LOWER: 'lt',
	LOWER_OR_EQUAL: 'lte'
});

const FN_TOKENS = new Enum({
	AVG: 'avg',
	COUNT: 'count',
});


/**
 * @class
 * @classdef constructs ModelTree based on the querystring
 *
 * @param {string} queryString
 * 
 * @access public
 */
module.exports = class QueryLexer {
	constructor(queryString='') {
		this.tree = new ModelsTree();
		this.queryString = queryString;
	}

	async parse(queryString=this.queryString, tree=this.tree) {
		if (typeof queryString !== 'string') {
			const err = new TypeError(`Invalid 'queryString'.`);
			return Promise.reject(err);
		}

		// You never know if it's encoded or not.
		const decoded = decodeURI(queryString);

		await this.parseIsolatedQuery(decoded, 0, this.tree);

		return Promise.resolve(this.tree.root.toObject());
	}

	async parseIsolatedQuery(queryString='', startAt=0, tree) {
		const isSubQuery = tree.node.model !== 'root';

		// Token is a String, accumulated char-by-char.
		let token = '';
		// Value of a param ('id=10' OR 'attributes=id,text').
		let value = [];
		// Model, that was active before a cursor went up in the tree.
		let previousActive = null;

		for (let i=startAt; i < queryString.length; i++) {
			const char = queryString[i];

			// ( can mean:
			// • params of OP token
			// • arguments of a function
			// • subquery of a model
			if (char === '(') {
				debug('char', char, { token, node: tree.node });

				// If OP token:
				if (OP_TOKENS.asArray.indexOf(token) > -1) {
					// Set operator token.
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
				const [ charsCount ] = await this.parseIsolatedQuery(queryString, i, tree);
				i += charsCount;

				previousActive = model;
				tree.up();

				continue;
			}

			// ) can mean:
			// • end of OP token params
			// • end of a function arguments
			// • end of a subquery of a model
			if (char === ')') {
				debug('char', char, { token, node: tree.node });

				// If end of OP token:
				if (!!tree.node.op) {

					// If token is empty, error:
					if (token === '') {
						const err = UnexpectedCharError(i, char);
						return Promise.reject(err);
					}

					// Structure of a value depends on OP:
					let fullOp = {};
					switch (tree.node.op) {
						case OP_TOKENS.NOT:
						case OP_TOKENS.LIKE:
						case OP_TOKENS.NOT_LIKE:
						case OP_TOKENS.GREATER:
						case OP_TOKENS.GREATER_OR_EQUAL:
						case OP_TOKENS.LOWER:
						case OP_TOKENS.LOWER_OR_EQUAL:
							fullOp = { [tree.node.activeParam]: { [tree.node.op]: [token] } };
							break;
						default:
							value.push({ [tree.node.activeParam]: [token] });
							fullOp = { [tree.node.op]: value };
							break;
					}

					// If this param is already in WHERE,
					// treat it like SQL AND:
					if (tree.node.where[tree.node.activeParam]) {
						// If this OP is already in the set,
						// concatenate arrays:
						if (tree.node.where[tree.node.activeParam][tree.node.op]) {
							Array.prototype.push.apply(
								tree.node.where[tree.node.activeParam][tree.node.op],
								fullOp[tree.node.activeParam][tree.node.op]
							);
						}
						else {
							const existingOps = tree.node.where[tree.node.activeParam];
							const newOps = fullOp[tree.node.activeParam];
							tree.node.where[tree.node.activeParam] = Object.assign({}, existingOps, newOps);
						}
					}
					else {
						tree.node.addWhere(fullOp);
					}

					// Reset:
					tree.node.resetOP();
					token = '';
					value = [];
					continue;
				}

				// If end of FN token:
				if (!!tree.node.fn) {
					// Token is the param of this fn:
					const fnParams = {
						fn: tree.node.fn
					};
					switch (tree.node.fn) {
						// ToDo: cases with multiple args.

						default:
							fnParams.args = [token];
							break;
					}

					tree.node.addFunction(fnParams);

					// Reset:
					tree.node.resetFN();
					token = '';
					value = [];
					continue;
				}

				// If end of subquery:
				if (!!tree.node.activeParam && tree.node.activeParam !== PARAM_TOKENS.INCLUDES) {
					// Set value:
					if (token.length > 0) {
						this.setNodeParam(tree.node, token, value);
					}
					
					// Reset:
					tree.node.resetActiveParam();
					tree.node.resetOP();

					// Lift from subquery.
					tree.up();
				}
				const numberOfProcessedChars = i - startAt;
				return [ numberOfProcessedChars ];
			}

			// , can mean:
			// • new param in a Op params array
			// • new argument for a function
			// • new horizontal include
			if (char === ',') {
				debug('char', char, { token, node: tree.node });

				// If OP token:
				if (!!tree.node.op) {
					switch(tree.node.op) {
						case OP_TOKENS.NOT_IN:
						case OP_TOKENS.IN:
							value.push(token);
							break;
						default:
							value.push({
								[tree.node.activeParam]: [token]
							});
							break;
					}

					// Reset.
					token = '';
					continue;
				}

				// If a new function:
				if (tree.node.activeParam === PARAM_TOKENS.FUNCTIONS) {
					// Prepare for a new function:
					tree.node.resetFN();
					continue;
				}

				// Just quit from subquery:
				if (token.length === 0) {
					continue;
				}

				// If param is a value:
				if (tree.node.activeParam !== PARAM_TOKENS.INCLUDES) {
					value.push(token);
					token = '';
					continue;
				}

				// Horizontal include:
				if (tree.node.activeParam === PARAM_TOKENS.INCLUDES) {
					const model = token;
					tree.use(model) ?? tree.include(model);

					// Last token (model) was included,
					// now jump to the root and proceed to collect the next token (model).
					tree.node.resetActiveParam();
					tree.upToRoot();

					tree.node.activeParam = PARAM_TOKENS.INCLUDES;

					token = '';
					continue;
				}

				const err = UnexpectedCharError(i, char);
				return Promise.reject(err);
			}

			// . can mean:
			// • vertical include
			// • or it can be a part of a param for "where"
			if (char === '.') {
				debug('char', char, { token, node: tree.node });

				// Vertical include:
				if (!!previousActive && token.length === 0) {
					tree.use(previousActive);
					tree.node.activeParam = PARAM_TOKENS.INCLUDES;
					token = '';
					previousActive = null;
					continue;
				}

				// If include of a new model:
				if (token.length > 0) {
					const model = token;
					tree.use(model) ?? tree.include(model).use(model);

					// Prepare for more includes:
					tree.node.activeParam = PARAM_TOKENS.INCLUDES;

					token = '';
					continue;
				}

				const err = UnexpectedCharError(i, char);
				return Promise.reject(err);
			}

			// + can only mean horizontal include:
			if (char === '+') {
				debug('char', char, { token, node: tree.node });

				// If include of a new model:
				if (token.length > 0) {
					const model = token;
					// Include, but do not use:
					tree.use(model) ?? tree.include(model).use(model);
					tree.up();

					// Prepare for more includes:
					tree.node.activeParam = PARAM_TOKENS.INCLUDES;

					token = '';
					continue;
				}

				if (tree.node.hasParent === false) {
					const err = UnexpectedCharError(i, char);
					return Promise.reject(err);
				}

				tree.up();
				tree.node.activeParam = PARAM_TOKENS.INCLUDES;

				continue;
			}

			// & can mean:
			// • the end of key=value pair in root and sub query
			// • the end of subincludes
			if (char === '&') {
				debug('char', char, { token, node: tree.node });

				// If any OP at all:
				if (!!tree.node.op) {
					const err = MissingCharError(i+1, ')');
					return Promise.reject(err);
				}

				// If end of a key=value pair:
				if (!!tree.node.activeParam
						&& tree.node.activeParam !== PARAM_TOKENS.FUNCTIONS
						&& tree.node.activeParam !== PARAM_TOKENS.INCLUDES
					) {
					if (token.length > 0) {
						// Set value.
						this.setNodeParam(tree.node, token, value);
					}

					// Reset:
					tree.node.resetActiveParam();
					token = '';
					value = [];
					continue;
				}
				else if (tree.node.activeParam === PARAM_TOKENS.FUNCTIONS) {
					// If token has some chars,
					// then it's a syntactic error:
					if (token.length > 0) {
						const err = new NodesterQueryError(`unrecognized char at position ${ i }: Unknown token '${ token }'`);
						return Promise.reject(err);
					}

					// Reset:
					tree.node.resetActiveParam();
					token = '';
					value = [];
					continue;
				}
				else if (tree.node.activeParam === PARAM_TOKENS.INCLUDES) {
					// If token has some chars,
					//	then it's include of a new model:
					if (token.length > 0) {
						const model = token;
						// Just include, no use.
						tree.include(model);
					}
					// If token is empty,
					//	it's most possibly a subquery
					else {
						continue;
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
				return Promise.reject(err);
			}
			
			// [ can mean:
			// • start of 'in' / 'notIn'
			if (char === '[') {
				tree.node.op = OP_TOKENS.IN;
				if (token.length > 0) {
					if (token === '!' || token === 'not') {
						tree.node.op = OP_TOKENS.NOT_IN;
					}
					else {
						const err = UnexpectedCharError(i - token.length, token);
						return Promise.reject(err);
					}
				}

				// Reset:
				token = '';
				continue;
			}

			// ] can mean:
			// • end of 'in' / 'notIn'
			if (char === ']') {
				// User missed first '[' :
				if (
					tree.node.op !== OP_TOKENS.IN
					&&
					tree.node.op !== OP_TOKENS.NOT_IN
				) {
					const err = UnexpectedCharError(i, char);
					return Promise.reject(err);
				}

				// Token is the last element in this array:
				if (token.length > 0) {
					value.push(token);
				}

				tree.node.addWhere({
					[tree.node.activeParam]: {
						[tree.node.op]: value
					}
				});

				// Reset:
				tree.node.resetOP();
				tree.node.resetActiveParam();
				value = [];
				token = '';
				continue;
			}
			
			// = can only mean the end of a param name:
			if (char === '=') {
				const param = this.parseParamFromToken(token);

				if (isSubQuery === true && param === PARAM_TOKENS.INCLUDES) {
					const err = new NodesterQueryError(`'include' is forbidden inside subquery (position ${ i }). Use: 'model.submodel' or 'model.submodel1+submodel2'.`);
					return Promise.reject(err);
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
					return Promise.reject(err);
				}

				// If any Function:
				if (!!tree.node.fn) {
					const err = MissingCharError(i+1, ')');
					return Promise.reject(err);
				}

				// If any OP at all:
				if (!!tree.node.op) {
					const err = MissingCharError(i+1, ')');
					return Promise.reject(err);
				}
				
				this.setNodeParam(tree.node, token, value);

				// If end of subquery:
				if (isSubQuery === true) {
					const numberOfProcessedChars = i+1 - startAt;
					return [ numberOfProcessedChars ];
				}
			}
		}

		// Must return it's portion of chars.
		return Promise.resolve([ queryString.length - startAt ]);
	}

	parseParamFromToken(token) {
		switch(token) {
			case 'attributes':
			case 'a':
				return PARAM_TOKENS.ATTRIBUTES;

			case 'functions':
			case 'fn':
				return PARAM_TOKENS.FUNCTIONS;

			case 'includes':
			case 'in':
				return PARAM_TOKENS.INCLUDES;

			// Clauses:
			case 'group_by':
				return PARAM_TOKENS.GROUP_BY;

			case 'limit':
			case 'l':
				return PARAM_TOKENS.LIMIT;

			case 'order':
			case 'o':
				return PARAM_TOKENS.ORDER;

			case 'order_by':
			case 'oby':
				return PARAM_TOKENS.ORDER_BY;

			case 'skip':
			case 's':
				return PARAM_TOKENS.SKIP;
			// Clauses\

			default:
				return token;
		}
	}

	setNodeParam(treeNode, token, value) {
		const param = treeNode.activeParam;

		debug(`set param`, { param, token, value });

		switch(param) {
			case PARAM_TOKENS.ATTRIBUTES:
				if (token) value.push(token);
				treeNode.attributes = value;
				break;

			case PARAM_TOKENS.FUNCTIONS:
				treeNode.addFunction(value);
				break;

			case PARAM_TOKENS.INCLUDES:
				const node = new ModelsTreeNode(token);
				treeNode.include(node);
				break;

			// Clauses:
			case PARAM_TOKENS.GROUP_BY:
				treeNode.group_by = token;
				break;

			case PARAM_TOKENS.LIMIT:
				treeNode.limit = parseInt(token);
				break;

			case PARAM_TOKENS.SKIP:
				treeNode.skip = parseInt(token);
				break;

			case PARAM_TOKENS.ORDER:
				treeNode.order = token;
				break;

			case PARAM_TOKENS.ORDER_BY:
				treeNode.order_by = token;
				break;
			// Clauses\

			default:
				if (token) value.push(token);
				treeNode.addWhere({ [param]: value });
				break;
		}
	}

	parseOP(opToken) {
		switch(opToken) {
			case '|':
			case 'or':
				return OP_TOKENS.OR;

			case '!like':
			case 'notLike':
				return OP_TOKENS.NOT_LIKE;

			case 'not':
			case '!':
				return OP_TOKENS.NOT;

			default:
				return opToken;
		}
	}

	[util.inspect.custom](depth, opts) {
		return this.tree.root;
	}
}


function UnexpectedCharError(index, char) {
	const err = new NodesterQueryError(`Unexpected '${ char }' at position ${ index }`);
	return err;
}

function MissingCharError(index, char) {
	const err = new NodesterQueryError(`Missing '${ char }' at position ${ index }`);
	return err;
}
