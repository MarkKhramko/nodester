const Params = require('nodester/params');

const log = require('nodester/loggers/dev');


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
		const {
			query
		} = Params(params, {
			query: {}
		});

		const instance = await this.model.findOne(query);

		const result = {
			[this.modelName.singular]: instance,
			count: 0 + instance !== null
		}
		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ [this.modelName.singular] }Facade.getOne error:`, error);
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
		const {
			query
		} = Params(params, {
			query: {}
		});

		const instances = await this.model.findAll(query);

		const result = {
			[this.modelName.plural]: instances,
			count: instances.length
		}
		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ [this.modelName.singular] }Facade.getMany error:`, error);
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
		const {
			data,
			includes,
		} = Params(params, {
			data: null,
			includes: null,
		});

		const instance = await this.model.create({ ...data }, {
			include: this.model.getIncludesList(data)
		});

		// If includes are set, "find" this record with includes:
		if (!!includes && includes?.length > 0) {
			await instance.reload({ include: includes });
		}

		const result = {
			[this.modelName.singular]: instance,
			count: instance === null ? 0 : 1
		}

		// Call after create.
		await this.afterCreateOne(instance, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ [this.modelName.singular] }Facade.createOne error:`, error);
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
		const {
			query,
			data
		} = Params(params, {
			query: {},
			data: null
		});

		const updateResult = await this.model.updateOne(query.where, data);;

		const [ isNewRecord, instance ] = updateResult;

		const result = {
			success: isNewRecord === false,
			[this.modelName.singular]: instance,
			count: !!instance ? 1 : 0
		}
		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ [this.modelName.singular] }Facade.updateOne error:`, error);
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
		const {
			query
		} = Params(params, {
			query: null
		});

		const count = await this.model.deleteOne(query);

		const result = {
			success: count > 0,
			count: count
		};
		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ [this.modelName.singular] }Facade.deleteOne error:`, error);
		return Promise.reject(error);
	}
}
