const Router = require('nodester/router');

const { v1 } = require('./utils');
const Path = require('path');


module.exports = function authRouterAPI1() {
	const cwd = process.cwd();

	const controllersPath = Path.join(cwd, 'src', 'app', 'controllers');
	const providersPath = Path.join(cwd, 'src', 'app', 'providers');
	
	const router = new Router({ controllersPath, providersPath });

	// Auth endpoints
	router.add.route(
		v1('post /auth/token'),
		{ providedBy: 'Auth.issueToken' }
	);

	router.add.route(
		v1('post /auth/refresh'),
		{ providedBy: 'Auth.refreshToken' }
	);

	router.add.route(
		v1('post /auth/revoke'),
		{ providedBy: 'Auth.revokeToken' }
	);

	router.add.route(
		v1('post /auth/logout'),
		{ providedBy: 'Auth.logout' }
	);

	// JWKS endpoint (public, no version prefix)
	router.add.route(
		'get /.well-known/jwks.json',
		{ providedBy: 'Auth.getJWKS' }
	);

	return router;
}
