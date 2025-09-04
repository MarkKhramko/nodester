const Router = require('nodester/router');
const { v1 } = require('./utils');
const Path = require('path');


module.exports = function visitorRouterAPI1() {
	const cwd = process.cwd();

	const controllersPath = Path.join(cwd, 'src', 'app', 'controllers');
	const providersPath = Path.join(cwd, 'src', 'app', 'providers');
	
	const router = new Router({ controllersPath, providersPath });


	router.add.route(
		v1('get /status'),
		{ providedBy: 'API.getStatus' }
	);

	return router;
}