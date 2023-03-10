/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

// Utils.
const { typeOf } = require('../utils/types.util');


module.exports = class NodesterRoute {
	
	/**
	 * Initialize a new `NodesterRoute`.
	 *
	 * @param {Object|String} routeStringOrOpts
	 * - {String} method
	 * - {String} route
	 * - {Array} parts
	 * - {Object} params
	 *
	 * @api public
	 */
	constructor(routeStringOrOpts={}) {
		if (typeOf(routeStringOrOpts) === 'Object') {
			this.method = opts.method ?? undefined;
			this.route = opts.route ?? null;
			this.parts = opts.parts ?? [];
			this.params = opts.params ?? {};
		}
		else if (typeOf(routeStringOrOpts) === 'string'){
			this.method = undefined;
			this.route = null;
			this.parts = [];
			this.params = {};

			if (routeStringOrOpts.length === 0) {
				return this;
			}

			// Parse:
			const parts = routeStringOrOpts.split(' ');
			const cleared = parts.filter(p => p.length > 0);

			// Set method:
			if (cleared[0].indexOf('/') === -1) {
				const method = cleared.shift().toUpperCase();
				this.method = method;
			}

			// Build route one again and set it:
			const clearRoute = cleared.join('');
			this.route = clearRoute;

			// Parse path parts:
			const pathParts = clearRoute.split('/')
																	.filter(p => p.length > 0);
			this.parts = pathParts;
		}
	}


	/**
	 * @param {String} routeToTest
	 *
	 * @return {Boolean}
	 *
	 * @alias matches
	 * @private
	 */
	matches(routeToTest='') {
		const {
			route,
			parts,
			params
		} = this;

		if (routeToTest === route) {
			return true;
		}

		// Break route & test:
		const testParts = routeToTest.split('/')
																 .filter(p => p.length > 0);
		let matched = true;
		if (testParts.length === 0) {
			matched = route === '/';
		}
		else {
			for (let i=0; i < testParts.length; i++) {
				const part = parts[i];
				const testPart = testParts[i];

				// If route is shorter:
				if (!part) {
					matched = false;
					break;
				}

				// If part is wild:
				if (part === '*') {
					matched = true;
					this.params.pathParts = testParts.slice(i);
					break;
				}

				// If part is param:
				if (part[0] === ':') {
					this.params[part.split(':')[1]] = testPart;
					continue;
				}

				// If not matched:
				if (part !== testPart) {
					matched = false;
					break;
				}
			}
		}

		return matched;
	}
}
