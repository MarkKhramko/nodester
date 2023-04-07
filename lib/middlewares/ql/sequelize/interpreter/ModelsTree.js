const debug = require('debug')('nodester:interpreter:ModelsTree');


class ModelsTreeNode {
	constructor(model, parent=null, opts={}) {
		this.model = model;
		this.parent = parent;
		this.activeParam = null;
		this.op = null;

		// for override:
		this.fields = [];
		this._where = {};
		this.skip = 0;
		this.limit = -1; // No limit

		this.includes = opts.includes ?? [];
		this.order = opts.order ?? 'asc';
		this.order_by = opts.order_by ?? 'id';
	}

	get hasParent() {
		return this.parent !== null;
	}

	get includesCount() {
		return Object.values(this.includes).length;
	}

	get hasIncludes() {
		return this.includesCount > 0;
	}

	get where() {
		return this._where;
	}

	resetActiveParam() {
		this.activeParam = null;
	}

	resetOP() {
		this.op = null;
	}

	addWhere(condition={}) {
		this._where = {
			...this.where,
			...condition
		}
	}

	include(modelTreeNode) {
		modelTreeNode.parent = this;
		this.includes.push(modelTreeNode);
		return modelTreeNode;
	}

	toObject() {
		return {
			model: this.model,

			where: this.where,
			skip: this.skip,
			limit: this.limit,
			order: this.order,
			order_by: this.order_by,
			
			fields: this.fields,

			includes: this.includes.map(i => i.toObject())
		}
	}
}

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
