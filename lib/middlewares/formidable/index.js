/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const {
	HTTP_CODE_NOT_ACCEPTABLE
} = require('nodester/http/codes');

const { formidable } = require('formidable');

const { createErrorResponse } = require('nodester/factories/responses/rest');


module.exports = function initFormidableMiddleware(formidableOptions={}) {
	const context = {
		formidableOptions
	}
	return formidableHandle.bind(context);
};

async function formidableHandle(req, res, next) {
	try {
		const form = formidable(this.formidableOptions);
		const [fields, files] = await form.parse(req);

		// Add to request:
		req.form = {
			fields,
			files
		};

		return next();
	}
	catch(error) {
		return createErrorResponse(res, {
			error: error,
			status: error.status ?? HTTP_CODE_NOT_ACCEPTABLE
		})
	}
}
