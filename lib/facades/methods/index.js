
module.exports = {
	getOne: _getOne,
	getMany: _getMany,
	createOne: _createOne,
	updateOne: _updateOne,
	deleteOne: _deleteOne
}


/*
 *
 * @param {Object} params
 *
 * @alias getOne
 * @api public
 */
async function _getOne(params) {
	try {
		const { query } = params;

		const instance = await this.model.findOne(query);

		const result = {
			[this.modelName.singular]: instance,
			count: 0 + instance !== null
		}
		return Promise.resolve(result);
	}
	catch(error) {
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} params
 *
 * @alias getMany
 * @api public
 */
async function _getMany(params) {
	try {
		const { query } = params;

		const instances = await this.model.findAll(query);

		const result = {
			[this.modelName.plural]: instances,
			count: instances.length
		}
		return Promise.resolve(result);
	}
	catch(error) {
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} params
 *
 * @alias createOne
 * @api public
 */
async function _createOne(params) {
	try {
		const result = {
			count: 1
		}
		return Promise.resolve(result);
	}
	catch(error) {
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} params
 *
 * @alias updateOne
 * @api public
 */
async function _updateOne(params) {
	try {
		const result = {
			count: 1
		}
		return Promise.resolve(result);
	}
	catch(error) {
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} params
 *
 * @alias deleteOne
 * @api public
 */
async function _deleteOne(params) {
	try {
		const result = {
			count: 1
		}
		return Promise.resolve(result);
	}
	catch(error) {
		return Promise.reject(error);
	}
}
