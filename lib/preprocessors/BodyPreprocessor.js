// Constants.
const VISITOR = 'visitor';

// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class BodyPreprocessor {
	constructor(
		availableParamsForRoles,
		staticParamsForRoles,
		customProcessFunction
	) {
		this.availableParamsForRoles = availableParamsForRoles ?? {};
		this.staticParamsForRoles = staticParamsForRoles ?? {};

		this.customProcessFunction = customProcessFunction ? customProcessFunction : ()=>{};
	}

	async extract(
		req,
		role
	) {
		try {
			const requestBody = req.body;

			if (!requestBody || typeof requestBody !== 'object') {
				const err = new Err();
				err.name = 'ValidationError';
				throw err;
			}

			// Get role or set "visitor"
			const _role = typeof role === 'string' && role.length > 1 ? role : VISITOR;

			const resultBody = {};

			const params = this.availableParamsForRoles[_role] ?? [];
			const staticValues = this.staticParamsForRoles[_role] ?? {};

			params.forEach((param) => {
				// If such param is set in body:
				if (!!requestBody[param]) {
					resultBody[param] = staticValues[param] ?? requestBody[param];
				}
				// If such param is not set, but we have a "static" for it:
				else if (!requestBody[param] && !!staticValues[param]) {
					resultBody[param] = staticValues[param];
				}
			});

			// Make further preprocessing using customly defined function.
			await this.customProcessFunction.call(this, req, role, resultBody);

			return Promise.resolve(resultBody);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
}
