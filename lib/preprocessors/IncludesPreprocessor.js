// Constants:
const VISITOR = 'visitor';
const DefaultAvailableParamsForRoles = { [VISITOR]: [] };
const DefaultStaticParamsForRoles = { [VISITOR]: [] };

// Custom error.
const { Err } = require('nodester/factories/errors');


module.exports = class IncludesPreprocessor {

	constructor(
		availableParamsForRoles,
		staticParamsForRoles,
		customProcessFunction=()=>{}
	) {
		this.availableParamsForRoles = availableParamsForRoles ?? DefaultAvailableParamsForRoles;
		this.staticParamsForRoles = staticParamsForRoles ?? DefaultStaticParamsForRoles;

		this.customProcessFunction = customProcessFunction ? customProcessFunction : ()=>{};
	}

	async extract(
		req,
		role
	) {
		const requestIncludes = req.query?.includes ?? [];

		if (!requestQuery || typeof requestQuery !== 'object') {
			const err = new Err();
			err.name = 'ValidationError';
			throw err;
		}

		// Get role or set "visitor"
		const _role = typeof role === 'string' && role.length > 1 ? role : VISITOR;

		const resultIncludes = [];

		const params = this.availableParamsForRoles[_role] ?? [];
		const staticValues = this.staticParamsForRoles[_role] ?? [];

		params.forEach((param) => {
			// If such param is set in query:
			if (requestIncludes.indexOf(param) !== -1) {
				resultIncludes.push(param);
			}
		});

		// Make further preprocessing using custom defined function.
		await this.customProcessFunction.call(this, req, role, resultIncludes);

		return resultIncludes;
	}
}
