/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const { formidable } = require('formidable');


module.exports = function FormidableMiddleware(formidableOptions={}) {
	return async function(req, res, next) {
		try {
			const form = formidable(formidableOptions);
			const [fields, files] = await form.parse(req);

			// Add to request:
			req.form = {
				fields,
				files
			};

			next();
		}
		catch(error) {
			const statusCode = error.status || 406;
			res.status(statusCode);
			res.json({
				error: {
					message: error.message,
					code: statusCode
				},
				status: statusCode
			});
		}
	}
};

