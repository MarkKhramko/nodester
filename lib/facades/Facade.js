const Params = require('nodester/facades/FacadeParams');
// Utils:
const { lowerCaseFirstLetter } = require('nodester/utils/strings.util');
const { parseIncludesQuery } = require('nodester/services/includes.service');
const { parseQueryParams } = require('nodester/utils/queries.util');


module.exports = class Facade {
	constructor(modelDefinition) {
		if (!modelDefinition)
			throw new Error('"modelDefinition" argument is invalid.');

		this.model = modelDefinition;
		this.nameSingular = lowerCaseFirstLetter(modelDefinition?.options?.name?.singular);
		this.namePlural = lowerCaseFirstLetter(modelDefinition?.options?.name?.plural);
	}

	/*
	 * @param <Object> data
	 */
	async createOne(params) {
		try {
			const {
				data,
				includes,
			} = Params(params, {
				data: null,
				includes: null,
			});

			// Parse includes string to array.
			const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

			const instance = await this.model.create({ ...data }, {
				include: this.model.getIncludesList(data)
			});

			// If includes are set, "find" this record with includes:
			if (!!_includes && _includes?.length > 0) {
				await instance.reload({ include: _includes });
			}

			const result = {
				[this.nameSingular]: instance,
				count: 1
			};

			// Call after create.
			await this.afterCreate(instance, params, result);

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	/*
	 * @param <Object> data
	 */
	async getOrCreateOne(params) {
		try {
			const {
				id,
				query,
				data,
				includes,
			} = Params(params, {
				id: null,
				query: null,
				data: null,
				includes: null,
			});

			// Parse includes string to array.
			const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

			let instance, isNewRecord;

			if (!!id) {
				const [ _instance, _isNewRecord ] = await this.model.findOrCreate({
					where: {
						id: parseInt(id)
					},
					defaults: data
				});

				// Find this model again with passed includes.
				instance = await this.model.findById(id, _includes);

				isNewRecord = _isNewRecord;
			}
			else if (!!query) {
				// New sequilize query.
				const modelQuery = {};

				// If includes are set:
				if (!!_includes) {
					modelQuery.include = [ ..._includes ];
				}

				parseQueryParams(query, modelQuery);

				let _instance = await this.model.findOne(modelQuery);

				// Define "isNewRecord".
				isNewRecord = !instance;

				// If no record in DB, create new one:
				if (!_instance) {
					_instance = await this.model.create({ ...data }, {
						include: this.model.getIncludesList(data)
					});

					instance = _instance;

					// If includes are set, "find" this record with includes:
					if (!!_includes && _includes?.length > 0) {
						await instance.reload({ include: _includes });
					}
				}
				else {
					instance = _instance;
				}
			}

			const result = {
				[this.nameSingular]: instance,
				count: 1,
				isNewRecord: isNewRecord
			};

			// If new record, call "after create":
			if (!!isNewRecord) {
				await this.afterCreate(instance, params, result);
			}

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	/*
	 * @param <ModelInstance> instance
	 * @param <Array> params
	 */
	async afterCreate(
		instance,
		params,
		result
	) {
		// This method is empty, as it should be overwritten.
		return Promise.resolve();
	}

	/*
	 * @param <UInt> id
	 * @param <Object> query
	 * @param <Array> includes
	 */
	async getOne(params) {
		try {
			const {
				id,
				query,
				includes,
			} = Params(params, {
				id: null,
				query: null,
				includes: null,
			});
			
			// Parse includes string to array.
			const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

			let instance = null;

			if (!!id || !!query?.id) {
				instance = await this.model.findById(( id ?? query.id ), _includes);
			}
			else if (!!query) {
				// New sequilize query.
				const modelQuery = {};

				// If includes are set:
				if (!!_includes) {
					modelQuery.include = [ ..._includes ];
				}

				parseQueryParams(query, modelQuery);

				instance = await this.model.findOne(modelQuery);
			}

			const result = {
				[this.nameSingular]: instance,
				count: !!instance ? 1 : 0
			};

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	/*
	 * @param <Object> query
	 * @param <Array> includes
	 */
	async getMany(params) {
		try {
			const {
				query,
				includes,
			} = Params(params, {
				query: {},
				includes: null
			});

			// Parse includes string to array.
			const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

			// New sequilize query.
			const modelQuery = {};

			// If includes are set:
			if (!!_includes) {
				modelQuery.include = [ ..._includes ];
			}

			parseQueryParams(query, modelQuery);

			// Get instances for current limits
			// and total number (Int) of such instances.
			const [
				instances,
				totalCount
			] = await Promise.all([
				this.model.findAll(modelQuery),
				this.model.count(modelQuery)
			]);

			const result = {
				[this.namePlural]: instances,
				
				count: instances.length,
				total_count: totalCount,

				limit: modelQuery.limit,
				skip: modelQuery.offset
			};

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	/*
	 * @param <UInt> id
	 * @param <Object> data
	 * @param <Array> includes
	 */
	async updateOne(params) {
		try {
			const {
				id,
				query,
				data,
				includes,
			} = Params(params, {
				id: null,
				query: {},
				data: null,
				includes: null,
			});

			// Parse includes string to array.
			const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

			let updateResult = null;

			if (!!id || !!query.id) {
				updateResult  = await this.model.updateById(( id ?? query.id ), data, _includes);
			}
			else {
				// New sequilize query.
				const modelQuery = {};
				parseQueryParams(query, modelQuery);

				updateResult = await this.model.updateOne(modelQuery.where, data, _includes);
			}

			const [ isNewRecord, instance ] = updateResult;

			const result = {
				success: isNewRecord === false,
				[this.nameSingular]: instance
			};

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}

	// TODO: finish updateMany:
	/*
	 * @param <UInt> id
	 * @param <Object> data
	 * @param <Array> includes
	 */
	// async updateMany(params) {
	// 	try {
	// 		const {
	// 			query,
	// 			data,
	// 			includes,
	// 		} = Params(params, {
	// 			query: {},
	// 			data: null,
	// 			includes: null,
	// 		});

	// 		const _includes = typeof includes === 'string' ? parseIncludesQuery(this.model, includes) : null;

	// 		let updateResult = null;

	// 		if (!!query.id) {
	// 			updateResult  = await this.model.updateById(query.id, data, _includes);
	// 		}
	// 		else {
	// 			// New sequilize query.
	// 			const modelQuery = {};
	// 			parseQueryParams(query, modelQuery);

	// 			updateResult = await this.model.update(modelQuery.where, data, _includes);

	// 			console.log({ updateResult });
	// 		}

	// 		const result = {
	// 			success:isNewRecord === false,
	// 			[this.nameSingular]:instance
	// 		};

	// 		// Send output.
	// 		return Promise.resolve(result);
	// 	}
	// 	catch(error) {
	// 		return Promise.reject(error);
	// 	}
	// }

	/*
	 * @param <UInt> id
	 */
	async deleteOne(params) {
		try {
			const { id } = Params(params, {
				id: null
			});

			const count = await this.model.deleteById(id);

			const result = {
				success: count > 0,
				count: count
			};

			// Send output.
			return Promise.resolve(result);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
}
