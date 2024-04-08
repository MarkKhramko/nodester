/**
 * nodester
 * MIT Licensed
 */

'use strict';

const httpCodes = require('nodester/http/codes');

const Sanitizations = require('nodester/utils/sanitizations');


module.exports = extract;

/**
 * Extracts data from the body, based on the rules in "filter".
 *
 * @param {Object} body
 * @param {NodesterFilter} filter
 * @param {SequilizeModel} model
 *
 * @access public
 * @return {Object} filteredBody
 */
function extract(body, filter=null, model) {

	const sequelize = model.sequelize;
	const modelAttributes = Object.keys(model.tableAttributes);
	const availableIncludes = Object.keys(model.associations);

	const bodyEntries = Object.entries(body);

	const { statics } = filter;


	// Result object.
	const filteredBody = {};

	for (const [key, value] of bodyEntries) {
		const isInclude = availableIncludes.indexOf(key) > -1;
		const isAttribute = modelAttributes.indexOf(key) > -1;

		if ((!isAttribute || filter.attributes.indexOf(key) === -1) && !isInclude) {
			const err = new Error(`Attribute '${ key }' is not available.`);
			err.status = httpCodes.NOT_ACCEPTABLE;
			throw err;
		}

		if (isAttribute) {
			const column = model.rawAttributes[key];
			const typeName = column.type.constructor.name;
			// Optional validation.
			const { validation } = column;
			
			const sanitizationOptions = {
				fallback: column.defaultValue ?? undefined,
				min: validation?.min ?? undefined,
				max: validation?.max ?? undefined
			}
			const sanitized = Sanitizations[typeName](value, sanitizationOptions);

			filteredBody[key] = sanitized;

			continue;
		}

		if (isInclude) {
			const availableIncludeFilters = Object.keys(filter.includes);

			if (availableIncludeFilters.indexOf(key) === -1) {
				const err = new Error(`Include '${ key }' is not available.`);
				err.status = httpCodes.NOT_ACCEPTABLE;
				throw err;
			}

			const thisIncludeFilter = filter.includes[key];

			const association = model.associations[key];
	
			// Mutliple includes:
			if (Array.isArray(value)) {
				filteredBody[key] = [];

				for (let thisIncludeBody of value) {
					filteredBody[key].push(
						extract(thisIncludeBody, thisIncludeFilter, association.target)
					)
				}
			}
			else {
				const thisIncludeBody = value;
				filteredBody[key] = extract(thisIncludeBody, thisIncludeFilter, association.target);
			}

			continue;
		}

		const err = new Error(`Unknown attribute '${ key }'.`);
		err.status = httpCodes.NOT_ACCEPTABLE;
		throw err;
	}
	
	return filteredBody;
}
