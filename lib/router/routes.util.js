/**
 * nodester
 * MIT Licensed
 */

'use strict';

const MiddlewaresStack = require('nodester/stacks/middlewares');

// Utils:
const { typeOf } = require('nodester/utils/types');
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
 * @access public
 */
function _wrapRouteHandler(routeInstance, handler) {
	const handlerType = typeOf(handler);

	let parsedHandler = null;
	let providedAction = null;

	if (handlerType === 'Object') {
		parsedHandler = parseRouteHandler(handler);

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
	}

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
			// If User set any middleware before:
			if (!!parsedHandler.before) {
				const _next = () => providedAction(req, res);

				if (typeOf(parsedHandler.before) === 'function') {
					await parsedHandler.before(req, res, _next);
				}
				else if (parsedHandler.before instanceof MiddlewaresStack) {
					await parsedHandler.before.process(req, res, _next);
				}
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
