
module.exports = function NodesterDefaultRouterLayer() {
	this.conditions = [];
	this.routesList = {};

	this.push = _push;
	this.route = _route;
}


/**
 *
 * @alias push
 * @public
 */
function _push(key='condition') {
	let args = [...arguments].shift();

	switch(key) {
		case 'condition':
			// this.conditions[]
			break;
		case 'route':
			const route = args.shift();
			this.routesList[route] = args;
			break;
		break;
	}

	return this;
}


/**
 *
 * @alias route
 * @public
 */
function _route(path='/') {
	const middlewares = [...arguments].shift();

	console.log({ path });
}


/**
 *
 * @alias push
 * @public
 */
