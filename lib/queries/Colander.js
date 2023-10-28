/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const CLAUSES = ['limit', 'skip', 'order', 'order_by'];

const { isModel } = require('../utils/models');


module.exports = class Colander {

	/*
	 *
	 * @param {Object|Model} optsOrModelDefinition
	 @ - @param {Model} model
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
	constructor(optsOrModelDefinition, noLimit=false) {
		this._fields = [];
		this._clauses = [];
		this._includes = {};
		
		this._statics = {
			attributes: {},
			clauses: {
				limit: 3
			}
		}
		if (noLimit === true) {
			delete this._statics.clauses.limit;
		}

		// If model:
		if (isModel(optsOrModelDefinition)) {
			this._fields = Object.keys(optsOrModelDefinition.tableAttributes);
			this._clauses = CLAUSES;
		}
		// If options:
		else {
			const {
				model,
				fields,
				clauses,
				includes,
				statics,
			} = optsOrModelDefinition;


			// If fields are array:
			if (Array.isArray(fields)) {
				this._fields = fields;
			}
			// If fields were not provided,
			// but we have full model definition:
			else if (isModel(model)) {
				this._fields = Object.keys(model.tableAttributes);
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
