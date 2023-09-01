const CLAUSES = ['limit', 'skip', 'order', 'order_by'];


module.exports = class Colander {

	/*
	 *
	 * @param {Object|Model} optsOrModelDefinition
	 * - @param {Array} fields
	 * - @param {Array} clauses
	 * - @param {Object} includes
	 * - @param {Object} statics
	 * -- @param {Object} attributes
	 * -- @param {Object} clauses
	 *
	 */
	constructor(optsOrModelDefinition) {
		this._fields = [];
		this._clauses = [];
		this._includes = {};
		
		this._statics = {
			attributes: {},
			clauses: {
				limit: 3
			}
		}

		// If model:
		if (!!optsOrModelDefinition.tableName && typeof optsOrModelDefinition._schema === 'object') {
			this._fields = Object.keys(optsOrModelDefinition.tableAttributes);
			this._clauses = CLAUSES;
		}
		// If options:
		else {
			const {
				fields,
				clauses,
				includes,
				statics,
			} = optsOrModelDefinition;

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
