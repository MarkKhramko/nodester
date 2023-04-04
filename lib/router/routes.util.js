/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

// Utils:
const { typeOf } = require('../utils/types.util');
const { parseRouteHandler } = require('./handlers.util');


module.exports = {
	wrapRouteHandler: _wrapRouteHandler
}


/**
	 * Wraps route handler.
	 *
	 * @param {Route} routeInstance
	 * @param {Function} handler
	 *
	 * @alias wrapRouteHandler
	 * @api public
	 */
function _wrapRouteHandler(routeInstance, handler) {
	const handlerType = typeOf(handler);

	const wrapped = async (req, res, next) => {
		// Get route without SearchParams.
		const route = req.url.split('?')[0];

		// If route not matched:
		const methodMatched = routeInstance.method === req.method;
		const routeMatched = routeInstance.matches(route);
		if (!methodMatched || !routeMatched) {
			return next();
		}

		// Populate params.
		req.params = routeInstance.params;

		if (handlerType === 'function') {
			await handler.call(this, req, res, next);
		}
		// If handler is an Object:
		else {
			const parsedHandler = parseRouteHandler(handler);

			// Get provided method from controller:
			const controller = this._controllers.get(parsedHandler.controllerName);
			const controllerAction = controller[parsedHandler.actionName];

			// If User set any middleware before, call it first:
			if (typeOf(parsedHandler.before) === 'function') {
				// Expose nquery first.
				await parsedHandler.before(req.nquery, req, res);
			}

			await controllerAction(req, res);
		}
	};

	return wrapped;
}
