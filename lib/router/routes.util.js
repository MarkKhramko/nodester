/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

// Utils:
const { typeOf } = require('../utils/types.util');
const { parseRouteHandler } = require('./handlers.util');


module.exports = {
	validateParsedRouteMethood: _validateParsedRouteMethood,
	wrapRouteHandler: _wrapRouteHandler
}


function _validateParsedRouteMethood(parsedRoute) {
	if (!parsedRoute || parsedRoute?.method === undefined) {
		const err = new TypeError(`"route" should start with one of the following methods: [GET, POST, PUT, DELETE, QUERY, HEADER, OPTIONS]`);
		throw err;
	}

	return true;
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
			
			// If User set any middleware before:
			if (typeOf(parsedHandler.before) === 'function') {
				const _next = () => providedAction(req, res);
				await parsedHandler.before(req, res, _next);
			}
			// If response was not sent,
			// perform action
			else if (res.headersSent === false) {
				await providedAction(req, res);
			}
		}
	};

	return wrapped;
}
