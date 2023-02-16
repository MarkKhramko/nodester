// Constants:
const VISITOR = 'visitor';
const DefaultAvailableParamsForRoles = { [VISITOR]: [ 'skip', 'limit', 'order' ] };
const DefaultStaticParamsForRoles = { [VISITOR]: { limit: 50 } };

// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class QueryPreprocessor {

	constructor(
		availableParamsForRoles,
		staticParamsForRoles,
		customProcessFunction
	) {
		this.availableParamsForRoles = availableParamsForRoles ?? DefaultAvailableParamsForRoles;
		this.staticParamsForRoles = staticParamsForRoles ?? DefaultStaticParamsForRoles;

		this.customProcessFunction = customProcessFunction ? customProcessFunction : ()=>{};
	}

	async extract(
		req,
		role
	) {
		try {
			const requestQuery = req.query;

			if (!requestQuery || typeof requestQuery !== 'object') {
				const err = new Err();
				err.name = 'ValidationError';
				throw err;
			}

			// Get role or set "visitor"
			const _role = typeof role === 'string' && role.length > 1 ? role : [VISITOR];

			const resultQuery = {};

			const params = this.availableParamsForRoles[_role] ?? [];
			const staticValues = this.staticParamsForRoles[_role] ?? {};

			params.forEach((param) => {
				// If such param is set in query:
				if (!!requestQuery[param]) {
					resultQuery[param] = staticValues[param] ?? requestQuery[param];
				}
				// If such param is not set, but we have a "static" for it:
				else if (!requestQuery[param] && !!staticValues[param]) {
					resultQuery[param] = staticValues[param];
				}
			});

			// Make further preprocessing using customly defined function.
			await this.customProcessFunction.call(this, req, role, resultQuery);

			return Promise.resolve(resultQuery);
		}
		catch(error) {
			return Promise.reject(error);
		}
	}
}
