/**
 * nodester
 * MIT Licensed
 */

'use strict';

const debug = require('debug')('nodester:interpreter:ModelsTree');


/**
 * @class
 *
 * @access public
 */
class ModelsTreeNode {
	constructor(model, parent=null, opts={}) {
		this.model = model;
		this.parent = parent;
		this.activeParam = null;
		this.op = null;
		this.fn = null;

		// for override:
		this._attributes = [];
		this._where = {};
		this._functions = [];
		this.skip = 0;
		this.limit = -1; // No limit

		this._includes = opts.includes ?? [];
		this.order = opts.order ?? 'asc';
		this.order_by = opts.order_by ?? 'id';
	}

	// Getters:
	get attributes() {
		return this._attributes;
	}

	get where() {
		return this._where;
	}

	get functions() {
		return this._functions;
	}

	get hasParent() {
		return this.parent !== null;
	}

	get includes() {
		return this._includes;
	}

	get includesCount() {
		return Object.values(this.includes).length;
	}

	get hasIncludes() {
		return this.includesCount > 0;
	}
	// Getters\

	// Setters:
	set attributes(array) {
		this._attributes = array;
	}

	resetActiveParam() {
		this.activeParam = null;
	}

	resetOP() {
		this.op = null;
	}

	resetFN() {
		this.fn = null;
	}

	addWhere(condition={}) {
		this._where = {
			...this.where,
			...condition
		}
	}

	addFunction(fnParams={}) {
		this._functions.push(fnParams);
	}

	include(modelTreeNode) {
		modelTreeNode.parent = this;
		this._includes.push(modelTreeNode);
		return modelTreeNode;
	}

	toObject() {
		return {
			model: this.model,

			attributes: this.attributes,
			functions: this.functions,

			where: this.where,

			skip: this.skip,
			limit: this.limit,
			order: this.order,
			order_by: this.order_by,
			

			includes: this.includes.map(i => i.toObject())
		}
	}
}

/**
 * @class
 *
 * @access public
 */
class ModelsTree {
	constructor() {
		this.root = new ModelsTreeNode('root', null);
		this.node = this.root;
	}

	include(model, opts={}) {
		debug('include', model);

		const node = new ModelsTreeNode(model, this.node, opts);
		this.node.include(node);
		return this;
	}

	use(model) {
		let foundOne = null;
		// Dirty search:
		for (const include of this.node.includes) {
			if (include.model === model) {
				foundOne = this.node = include;
				break;
			}
		}

		debug('use', model, !!foundOne ? '' : '-> failed.');
		
		return foundOne;
	}

	up() {
		if (this.node.hasParent) {
			this.node = this.node.parent;
		}

		debug('go up to', this.node.model);
	}

	upToRoot() {
		this.node = this.root;

		debug('go up to root');
	}
}

exports.ModelsTreeNode = ModelsTreeNode;
exports.ModelsTree = ModelsTree;
