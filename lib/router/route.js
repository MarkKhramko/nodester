/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Utils.
const { typeOf } = require('../utils/types.util');

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');


/**
 * Initialize a new `NodesterRoute`.
 *
 * @param {Object|String} routeStringOrOpts
 * @param {string}        [routeStringOrOpts.method]
 * @param {string}        [routeStringOrOpts.route]
 * @param {Array}         [routeStringOrOpts.parts]
 * @param {Object}        [routeStringOrOpts.params]
 *
 * @access public
 */
module.exports = class NodesterRoute {

	constructor(routeStringOrOpts={}) {
		ensure(routeStringOrOpts, 'object|string,required', 'routeStringOrOpts');
		
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
			const collapsedSpaces = routeStringOrOpts.replace(/\s\s+/g, ' ');
			const parts = routeStringOrOpts.split(' ');

			// Set method:
			if (parts[0].indexOf('/') === -1) {
				const method = parts.shift().toUpperCase();
				this.method = method;
			}

			// Build route one again and set it:
			const clearRoute = parts.join('');
			this.route = clearRoute;

			// Parse path parts:
			const pathParts = clearRoute.split('/')
																	.filter(p => p.length > 0);
			this.parts = pathParts;
		}
	}


	/**
	 * @param {string} routeToTest
	 *
	 * @return {boolean}
	 *
	 * @access private
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
