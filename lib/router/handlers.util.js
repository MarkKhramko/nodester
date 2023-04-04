/*!
 * /nodester
 * MIT Licensed
 */
'use strict';

const { typeOf } = require('../utils/types.util');


module.exports = {
	parseRouteHandler: _parseRouteHandler
}


/*
 * @param {Object} routeHandler
 * @return {Object} parsedRouteHandler
 *
 * @alias parseRouteHandler
 * @public
 */
function _parseRouteHandler(routeHandler={}) {
	if (!routeHandler) {
		const err = new TypeError(`"routeHandler" must be defined.`);
		throw err;
	}

	const result = {
		before: null,
		controllerName: undefined,
		actionName: undefined,
	};

	const {
		before,

		controller,
		controlledBy,
		action
	} = routeHandler;

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
	else if (!!action) {
		result.actionName = `${ action }`;
	}

	if (typeOf(before) === 'function') {
		result.before = before;
	}

	return result;
}
