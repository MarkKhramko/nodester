/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const CLAUSES = ['limit', 'skip', 'order', 'order_by'];

const { isModel } = require('../utils/models');


module.exports = class Filter {

	/*
	 *
	 * @param {Model} model
	 * @param {Object} opts
	 * - @param {Array} fields
	 * - @param {Array} clauses
	 * - @param {Object} includes
	 * - @param {Object} statics
	 * -- @param {Object} attributes
	 * -- @param {Object} clauses
	 *
	 * @param {Boolean} noLimit
	 *
	 */
	constructor(model=null, opts=null) {
		this._model = model;

		this._fields = [];
		this._clauses = [];
		this._includes = {};
		
		this._statics = {
			attributes: {},
			clauses: {}
		}

		// noLimit=false
		// if (noLimit === true) {
		// 	delete this._statics.clauses.limit;
		// }

		// If model is present:
		if (isModel(this._model)) {
			this._fields = Object.keys(this._model.tableAttributes);
			this._clauses = CLAUSES;

			// ...and no options are provided,
			// set default statics:
			if (!opts) {
				this.statics.clauses.limit = 3;
			}
		}
		
		// If options are defined:
		if (!!opts) {
			const {
				fields,
				clauses,
				includes,
				statics,
			} = opts;


			// If fields are array:
			if (Array.isArray(fields)) {
				this._fields = fields;
			}

			if (Array.isArray(clauses)) {
				this._clauses = clauses;
			}

			if (typeof includes === 'object') {
				this._includes = includes;
			}

			if (typeof statics === 'object') {
				if (typeof statics.attributes === 'object') {
					this._statics.attributes = statics.attributes;
				}

				if (typeof statics.clauses === 'object') {
					this._statics.clauses = statics.clauses;
				}
			}
		}
	}

	// Getters:
	get fields() {
		return this._fields;
	}

	get clauses() {
		return this._clauses;
	}

	get includes() {
		return this._includes;
	}

	get statics() {
		return this._statics;
	}
	// Getters\
}
