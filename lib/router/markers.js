const Route = require('./route');
// Utils.
const {
	validateParsedRouteMethood,
	wrapRouteHandler
} = require('./routes.util');


module.exports = {
	onlyRoute: _onlyRoute,
	onlyUse: _onlyUse
}

/*
 * 
 * @param {String} route
 * @param {Function} fn
 * @param {Function} markerFn
 *
 */
function _onlyRoute(route, fn, markerFn) {
	const parsedRoute = new Route(route);
	// Will throw exception if not valid.
	validateParsedRouteMethood(parsedRoute);

	const wrapped = async (req, res, next) => {
		const matched = await markerFn.call(this, req, res);
		// Skip, if marker's condition was not matched:
		if (!matched) {
			return next();
		}

		// Wrap and call:
		const routeHandler = wrapRouteHandler.call(this, parsedRoute, fn);
		await routeHandler.call(this, req, res, next);

		// If response was not sent,
		// go to the next one:
		if (res.headersSent === false) {
			next();
		}
	};
	return this.add.route(route, wrapped);
}


/*
 * 
 * @param {Function} fnOrRouter
 * @param {Function} markerFn
 *
 */
function _onlyUse(fnOrRouter, markerFn) {

	const wrapped = async (req, res, next) => {
		const matched = await markerFn.call(this, req, res);

		// Skip, if marker's condition was not matched:
		if (!matched) {
			return next();
		}

		const isRouter = fnOrRouter.constructor.name === 'NodesterRouter';

		const fn = isRouter ? fnOrRouter.handle.bind(fnOrRouter) : fnOrRouter;
		await fn.call(this, req, res, next);

		// If regular handler function:
		if (!isRouter) {
			// If response was not sent,
			// go to the next one:
			if (res.headersSent === false) {
				next();
			}
		}
	};
	return this.use(wrapped);
}
