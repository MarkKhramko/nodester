/*!
 * /nodester
 * MIT Licensed
 */
 
'use strict';

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
 * @param {Object} [params]
 * @param {Object} params.query
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
			[this.outputName.singular]: instance,
			count: 0 + (instance !== null)
		}

		// Hook (checkout facades/mixins).
		await this.afterGetOne(instance, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ this.name }.getOne error:`, error);
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} [params]
 * @param {Object} params.query
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
			[this.outputName.plural]: instances,
			count: instances.length
		}

		// Hook (checkout facades/mixins).
		await this.afterGetMany(instances, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ this.name }.getMany error:`, error);
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} [params]
 * @param {Object} params.data
 *
 * @alias createOne
 * @api public
 */
async function _createOne(params) {
	try {
		const {
			data,
		} = Params(params, {
			data: null,
		});

		const instance = await this.model.create({ ...data }, {
			include: this.model.getIncludesList(data)
		});

		const result = {
			[this.outputName.singular]: instance,
			count: 0 + (instance !== null)
		}

		// Hook (checkout facades/mixins).
		await this.afterCreateOne(instance, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ this.name }.createOne error:`, error);
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} [params]
 * @param {Object} params.query
 * @param {Object} params.data
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
			[this.outputName.singular]: instance,
			count: 0 + (instance !== null)
		}

		// Hook (checkout facades/mixins).
		await this.afterUpdateOne(instance, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ this.name }.updateOne error:`, error);
		return Promise.reject(error);
	}
}


/*
 *
 * @param {Object} [params]
 * @param {Object} params.query
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

		// Hook (checkout facades/mixins).
		await this.afterDeleteOne(null, params, result);

		return Promise.resolve(result);
	}
	catch(error) {
		log.error(`${ this.name }.deleteOne error:`, error);
		return Promise.reject(error);
	}
}
