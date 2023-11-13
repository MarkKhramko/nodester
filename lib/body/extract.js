/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const httpCodes = require('nodester/http/codes');

const Sanitizations = require('nodester/utils/sanitizations');


module.exports = extract;

function extract(body, filter=null, model) {

	const sequelize = model.sequelize;
	const modelFields = Object.keys(model.tableAttributes);
	const availableIncludes = Object.keys(model.associations);

	const bodyEntries = Object.entries(body);

	const { statics } = filter;


	// Result object.
	const newBody = {};

	for (const [key, value] of bodyEntries) {
		const isInclude = availableIncludes.indexOf(key) > -1;
		const isField = modelFields.indexOf(key) > -1;

		if ((!isField || filter.fields.indexOf(key) === -1) && !isInclude) {
			const err = new Error(`Field '${ key }' is not available.`);
			err.status = httpCodes.NOT_ACCEPTABLE;
			throw err;
		}

		if (isField) {
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

			newBody[key] = sanitized;

			continue;
		}

		if (isInclude) {
			const filterIncludes = Object.keys(filter.includes);

			if (filterIncludes.indexOf(key) === -1) {
				const err = new Error(`Include '${ key }' is not available.`);
				err.status = httpCodes.NOT_ACCEPTABLE;
				throw err;
			}

			const association = model.associations[key];
	
			newBody[key] = extract(value[0], filter.includes[key], association.target);

			continue;
		}

		const err = new Error(`Unknown field '${ key }'.`);
		err.status = httpCodes.NOT_ACCEPTABLE;
		throw err;
	}
	
	return newBody;
}
