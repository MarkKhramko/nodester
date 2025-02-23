/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const BOUNDS = require('../constants/Bounds');
const CLAUSES = require('../constants/Clauses');

const { isModel } = require('../utils/models');
const { ensure } = require('nodester/validators/arguments');

// Console:
const consl = require('nodester/loggers/console');


/**
 * @class
 * @classdesc NodesterFilter is a set of rules on how to process client's input.
 *
 * @param {Model} model
 * @param {Object} [options]
 * @param {Array}  options.attributes
 * @param {Array}  options.clauses
 * @param {Object} options.includes
 *
 * @param {Object} options.bounds
 * @param {Object} options.bounds.attributes
 * @param {Object} options.bounds.clauses
 *
 * @param {Object} options.statics
 * @param {Object} options.statics.attributes
 * @param {Object} options.statics.clauses
 *
 * @access public
 */
module.exports = class NodesterFilter {

	constructor(model=null, options={}) {
		ensure(options, 'object,required', 'options');
		
		this._model = model;

		this._attributes = [];
		this._clauses = [];
		this._functions = [];

		this._includes = {};

		this._bounds = {
			attributes: {},
			clauses: {}
		}
		
		this._statics = {
			attributes: {},
			clauses: {}
		}

		// If model is present:
		if (isModel(this.model)) {
			this._attributes = Object.keys(this.model.tableAttributes);
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
			attributes,
			clauses,
			functions,
			includes,
			bounds,
			statics,
		} = options;


		// Check attributes type:
		if (!!attributes) {
			if (!Array.isArray(attributes)) {
				const err = new TypeError(`[NodesterFilter]: 'attributes' parameter must be an array.`);
				throw err;
			}

			this._attributes = attributes;
		}

		// Check clauses type:
		if (!!clauses) {
			if (!Array.isArray(clauses)) {
				const err = new TypeError(`[NodesterFilter]: 'clauses' parameter must be an array.`);
				throw err;
			}

			this._clauses = clauses;
		}

		// If functions are set:
		if (!!functions) {
			if (
				typeof functions !== 'object'
				||
				Array.isArray(functions)
			) {
				const err = new TypeError(`[NodesterFilter]: 'functions' parameter must be an object.`);
				throw err;
			}

			this._functions = functions;
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

				const { associationType } = association;

				// If singular association:
				// (Fix of sequilize error "Only HasMany associations support include.separate")
				if ('HasMany' !== associationType) {
					// Empty bounds:
					if (!!includeFilter.statics.clauses.limit) {
						const msg = [
							`include "${ includeName }" has association type of`,
							`"${ associationType }", but has a filter clause "limit",`,
							`which is forbidden on any association type except for "HasMany".`,
							`It was automatically removed from clauses.`,
							`Consider also removing it from your code.`
						].join(' ');
						consl.warn(msg);
					}
					delete includeFilter.statics.clauses.limit;

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
	get attributes() {
		return this._attributes;
	}

	get clauses() {
		return this._clauses;
	}

	get functions() {
		return this._functions;
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
