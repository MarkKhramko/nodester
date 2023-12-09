/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

const { typeOf } = require('../utils/types.util');


module.exports = {
	parseRouteHandler: _parseRouteHandler
}


/**
 * @param {Object} routeHandler
 * @return {Object} parsedRouteHandler
 *
 * @alias parseRouteHandler
 * @acess public
 */
function _parseRouteHandler(routeHandler={}) {
	if (!routeHandler) {
		const err = new TypeError(`"routeHandler" must be defined.`);
		throw err;
	}

	const result = {
		actionName: undefined,
		before: null,
		controllerName: undefined,
		providerName: undefined
	};

	const {
		action,
		before,

		controller,
		controlledBy,

		provider,
		providedBy,
	} = routeHandler;

	// Controllers:
	if (!!controlledBy) {
		const parts = controlledBy.split('.');
		const controllerName = parts[0];
		const actionName = parts[1];
		result.controllerName = controllerName;
		result.actionName = actionName;
	}
	else if (!!controller) {
		result.controllerName = `${ controller }`;
	}
	// Controllers\

	// Providers:
	else if (!!providedBy) {
		const parts = providedBy.split('.');
		const providerName = parts[0];
		const actionName = parts[1];
		result.providerName = providerName;
		result.actionName = actionName;
	}
	else if (!!provider) {
		result.providerName = `${ provider }`;
	}
	// Providers\
	
	else if (!!action) {
		result.actionName = `${ action }`;
	}

	if (typeOf(before) === 'function') {
		result.before = before;
	}

	return result;
}
