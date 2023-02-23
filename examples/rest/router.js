'use strict'

const Router = require('nodester/router');
// Utils:
const Path = require('path');


module.exports = function initRouter() {
	const controllersPath = Path.join(__dirname, 'controllers');
	const router = new Router({ controllersPath });

	// router.add.route('get /orders', async (req, res) => {
	// 	res.json({ route: 'orders' });
	// });

	router.add.route('get /orders/*', { controlledBy: 'OrdersController.getMany' });
	router.add.route('get /orders/:id', { controlledBy: 'OrdersController.getOne' });

	return router.handle.bind(router);
}
