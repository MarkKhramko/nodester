/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const MiddlewareStack = require('../stacks/MiddlewareStack');
const MarkersStack = require('../stacks/MarkersStack');
const Route = require('./route');
// Utils:
const { typeOf } = require('../utils/types.util');
const { wrapRouteHandler } = require('./routes.util');
//	File system:
const Path = require('path');
const fs = require('fs');
const commonExtensions = require('common-js-file-extensions');
//	Debug & console:
const consl = require('../logger/console');
const debug = require('debug')('nodester:router');


module.exports = class NodesterRouter {
	
	/**
	 * Initialize a new `NodesterRouter`.
	 *
	 * @param {Object} opts
	 * - {Array} codeFileExtensions
	 * - {String} controllersPath
	 * - {Object} controllers
	 * - {Boolean} finalhandlerEnabled
	 *
	 * @api public
	 */
	constructor(opts={}) {
		// Reference to middlewares stack.
		this._middlewares = new MiddlewareStack({ finalhandlerEnabled: !!opts.finalhandlerEnabled });

		// Reference to the markers stack.
		this._markers = new MarkersStack();

		// Reference to the controllers stack.
		this._controllers = new Map();

		this.codeFileExtensions = commonExtensions.code;
		this.paths = {};

		// Indicates whether we can add more middlewares or no.
		this.isLocked = false;

		// Options:
		//	if "codeFileExtensions" was set:
		if (!!opts.codeFileExtensions && Array.isArray(opts.codeFileExtensions)) {
			this.codeFileExtensions = [...opts.codeFileExtensions];
		}

		//	If "controllersPath" was set, cache all controllers in directory:
		if (!!opts.controllersPath) {
			// Save path.
			this.paths.controllers = opts.controllersPath;

			const availableFileExtensions = this.codeFileExtensions;
			// Only get files, which have available file extensions:
			const fileNames = fs.readdirSync(this.paths.controllers);
			for (const fileName of fileNames) {
				const nameParts = fileName.split('.');
				if (availableFileExtensions.indexOf(nameParts[1]) === -1) {
					continue;
				}

				const controller = require(Path.join(this.paths.controllers, fileName));
				this.addController(controller, nameParts[0]);
			}
		}

		//	If "controllers" were provided as an Object:
		if (!!opts.controllers) {
			if (typeOf(opts.controllers) !== 'Object') {
				const err = new TypeError(`"controllers" must be an Object.`);
				throw err;
			}

			const entities = Object.entities(opts.controllers);
			for (const [controllerName, controllerDefinition] of entities) {
				this.addController(controllerDefinition, controllerName);
			}
		}
	}


	/*
	 * Adds:
	 * - (controller) new controller to the stack;
	 * - (middleware) new middleware to the stack;
	 * - (marker) new marker to the stack;
	 * - (route) new route to the stack;
	 *
	 * @api public
	 */
	get add() {
		return {
			controller: this.addController.bind(this),
			middleware: this.addMiddleware.bind(this),
			marker: this.addMarker.bind(this),
			route: this.addRoute.bind(this),
		}
	}


	/*
	 * Adds new controller to the controllers stack.
	 *
	 * @param {Function|Object} controller
	 * @param {String} controllerName
	 *
	 * @api public
	 */
	addController(fnOrObject, controllerName=null) {
		const controllerType = typeOf(fnOrObject);
		const name = controllerName ?? fnOrObject?.name ?? fnOrObject.constructor.name;

		// If controller was exported as Object:
		if (controllerType === 'Object') {
			this._controllers.set(name, fnOrObject);
		}
		// If controller was exported as a constructor function:
		else if (controllerType === 'function') {
			this._controllers.set(name, new fnOrObject());
		}
		else {
			const err = new TypeError(`Please check how you exported ${ name }, it should be either Object or constructor function.`);
			throw err;
		}
	}


	/*
	 * Adds new middleware to the stack.
	 *
	 * @param {Function} fn
	 * @param {Integer} index (0 or undefined)
	 *
	 * @return {Integer} index of new middleware
	 *
	 * @api public
	 */
	addMiddleware(fn, index) {
		return this._middlewares.add(fn, index);
	}


	/*
	 * Adds new marker to the stack.
	 *
	 * @param {String} markerName
	 * @param {Function} fn
	 *
	 * @api public
	 */
	addMarker(markerName='', fn) {
		if (markerName.length > 0 && markerName.indexOf('/') > -1) {
			const err = new TypeError(`"markerName" can't contain slashes "/"`);
			throw err;
		}

		if (this._markers.get(markerName)) {
			const err = new Error(`Marker with name ${ markerName } is already set.`);
			throw err;
		}

		this._markers.add(markerName, fn);
	}


	/*
	 * Creates route middleware and adds it to the stack.
	 *
	 * @param {String} route
	 * @param {Object|Function} handler
	 *
	 * @api public
	 */
	addRoute(route='', handler) {
		const parsed = new Route(route);
		const handlerType = typeOf(handler);
		
		// ToDo: move it to separate validator:
		if (parsed.method === undefined) {
			const err = new TypeError(`"route" should start with one of the following methods: [GET, POST, PUT, DELETE, QUERY, HEADER, OPTIONS]`);
			throw err;
		}

		if (handlerType === 'Object' && !this.paths.controllers) {
			const err = new TypeError(`Please set "controllersPath" during Router initialization.`);
			throw err;
		}

		const wrapped = wrapRouteHandler.call(this, parsed, handler);
		return this.addMiddleware(wrapped);
	}


	/*
	 * Proxy to .add.middleware()
	 *
	 * @param {Function} fn
	 *
	 * @api public
	 */
	use(fn) {
		return this.add.middleware(fn);
	}


	/*
	 * Adds middlewares, which only fires for set marker.
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	only(markerName='') {
		const self = this;
		const markerFn = this._markers.get(markerName);

		return {
			route: (route, fn) => {
				const parsed = new Route(route);
				// ToDo: move it to separate validator:
				if (parsed.method === undefined) {
					const err = new TypeError(`"route" should start with one of the following methods: [GET, POST, PUT, DELETE, QUERY, HEADER, OPTIONS]`);
					throw err;
				}

				const wrapped = async (req, res, next) => {
					const matched = await markerFn.call(self, req, res);
					// Skip, if marker's condition was not matched:
					if (!matched) {
						return next();
					}

					// Wrap and call:
					const routeHandler = wrapRouteHandler.call(self, parsed, fn);
					await routeHandler.call(self, req, res, next);

					// If response was not sent,
					// go to next one:
					if (res.headersSent === false) {
						next();
					}
				};
				return self.add.route(wrapped);
			},
			use: (fn) => {
				const wrapped = async (req, res, next) => {
					const matched = await markerFn.call(self, req, res);
					// Skip, if marker's condition was not matched:
					if (!matched) {
						return next();
					}

					await fn.call(self, req, res, next);

					// If response was not sent,
					// go to next one:
					if (res.headersSent === false) {
						next();
					}
				};
				return self.use(wrapped);
			}
		}
	}


	/**
	 * Handles server request.
	 *
	 * @api public
	 */
	handle(req, res, next) {
		return this._middlewares.process(req, res, next)
	}


	/*
	 * Prepare router for processing.
	 *
	 * @api public
	 */
	lock() {
		// Stack is ready.
		this.isLocked = true;

		debug(`router is locked`);

		this._middlewares.lock();
	}


	/*
	 * Unlocks router.
	 *
	 * @api public
	 */
	unlock() {
		this.isLocked = false;

		debug(`router is unlocked`);

		this._middlewares.unlock();
	}


	/*
	 * Removes something
	 */
	get remove() {
		return {
			middleware: this.removeMiddleware.bind(this)
		}
	}


	/**
	 * Removes middleware at index.
	 *
	 * @param {Integer} index
	 *
	 * @return {Integer} middlewares stack length
	 *
	 * @api public
	 */
	removeMiddleware(index=-1) {
		this._middlewares.remove(index);
		return this._middlewares.length;
	}
	


	/**
	 * Extends Router & makes sure, that "key" param is not present already.
	 *
	 * @param {String} key
	 * @param {Any} fnOrProperty
	 * @return {Any} fnOrProperty in Router
	 *
	 * @api public
	 */
	extend(key='', fnOrProperty) {
		const keys = Object.keys(this);
		if (keys.indexOf(key) > -1) {
			const err = new TypeError(`Key ${ key } is already present in Router instance`);
			throw err;
		}

		this[key] = fnOrProperty;

		return this[key];
	}
}
