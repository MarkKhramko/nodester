/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

const BOUNDS = require('../constants/Bounds');
const CLAUSES = require('../constants/Clauses');

const { isModel } = require('../utils/models');
const { ensure } = require('../validators/arguments');


module.exports = class NodesterFilter {

	/*
	 *
	 * @param {Model} model
	 * @param {Object} options
	 * - @param {Array} fields
	 * - @param {Array} clauses
	 * - @param {Object} includes
	 * - @param {Object} bounds
	 * -- @param {Object} clauses
	 * - @param {Object} statics
	 * -- @param {Object} attributes
	 * -- @param {Object} clauses
	 *
	 * @param {Boolean} noLimit
	 *
	 */
	constructor(model=null, options={}) {
		ensure(options, 'object,required', 'options');
		
		this._model = model;

		this._fields = [];
		this._clauses = [];
		this._includes = {};

		this._bounds = {
			fields: {},
			clauses: {}
		}
		
		this._statics = {
			attributes: {},
			clauses: {}
		}

		// If model is present:
		if (isModel(this.model)) {
			this._fields = Object.keys(this.model.tableAttributes);
			this._clauses = CLAUSES.asArray;

			// ...and no 'bounds' and 'statics' are provided,
			// set defaults:
			if (!options.bounds && !options.statics) {
				this._bounds.clauses.limit = {
					min: BOUNDS.limit.min,
					max: BOUNDS.limit.max
				}
			}
		}
		
		const {
			fields,
			clauses,
			includes,
			bounds,
			statics,
		} = options;


		// If fields are array:
		if (Array.isArray(fields)) {
			this._fields = fields;
		}

		if (Array.isArray(clauses)) {
			this._clauses = clauses;
		}

		// Includes:
		if (typeof includes === 'object') {
			const { associations } = this.model;
			for (const [ includeName, includeFilter ] of Object.entries(includes)) {
				const association = associations[includeName];
				// Validate association by name:
				if (association === undefined) {
					const error = new TypeError(`No include named '${ includeName }'.`);
					Error.captureStackTrace(error, this.constructor);
					throw error;
				}

				// If singular association:
				if (['HasMany', 'HasOne'].indexOf(association.associationType) === -1) {
					// Empty bounds.
					includeFilter.noBounds = true;
				}

				this._includes[includeName] = includeFilter;
			}
		}
		// Includes\

		if (typeof bounds === 'object') {
			this._bounds = bounds;
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

	get bounds() {
		return this._bounds;
	}

	get statics() {
		return this._statics;
	}

	get model() {
		return this._model;
	}
	// Getters\

	set noBounds(value) {
		if (value === true) {
			this._bounds.clauses = {};
		}
	}
}
