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

			let providedAction = null;

			// If Controller:
			if (parsedHandler.controllerName !== undefined) {
				// Get method (action) from Controller:
				const controller = this._controllers.get(parsedHandler.controllerName);
				const controllerAction = controller[parsedHandler.actionName];

				providedAction = controllerAction;
			}
			// If Controller\

			// If Provider:
			else {
				// Get method (action) from Provider:
				const provider = this._providers.get(parsedHandler.providerName);
				const providerAction = provider[parsedHandler.actionName];

				providedAction = providerAction;
			}
			// If Provider\
			
			// If User set any middleware before, call it first:
			if (typeOf(parsedHandler.before) === 'function') {
				const b = new Promise((resolve) => parsedHandler.before(req, res, resolve));
				await b;
			}

			await providedAction(req, res);
		}
	};

	return wrapped;
}
