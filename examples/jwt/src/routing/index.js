// Routers:
// 	API v1.
const apiV1 = require('./v1');

// Middlewares.
const NotFound = require('#middlewares/404');


module.exports = {
	routeTheApp: _routeTheApp
}

function _routeTheApp(app) {
	try {
		app.use(apiV1.auth());
		app.use(apiV1.visitor());

		// When no routes matched the request:
		const notFound = new NotFound();
		app.use(notFound.sendNotFound);
	}
	catch(error) {
		console.error('🔺 Failed to route the app.');
		throw error;
	}
}
