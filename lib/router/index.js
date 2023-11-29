/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const MiddlewaresStack = require('nodester/stacks/middlewares');
const Route = require('./route');

// Markers:
const MarkersStack = require('../stacks/MarkersStack');
const MarkerMethods = require('./markers');

// Utils:
const { typeOf } = require('../utils/types.util');
const {
	validateParsedRouteMethood,
	wrapRouteHandler
} = require('./routes.util');
const { parseProviderFileNames } = require('./utils');
//	File system:
const Path = require('path');
const fs = require('fs');
const commonExtensions = require('common-js-file-extensions');

// Arguments validator.
const { ensure } = require('../validators/arguments');

// Console:
const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:router');


module.exports = class NodesterRouter {
	
	/**
	 * Initialize a new `NodesterRouter`.
	 *
	 * @param {Object}  [opts]
	 * @param {Array} 	opts.codeFileExtensions
	 * @param {String} 	opts.controllersPath
	 * @param {Object} 	opts.controllers
	 * @param {Boolean} opts.finalhandlerEnabled
	 *
	 * @api public
	 */
	constructor(opts={}) {
		// Reference to the controllers stack.
		this._controllers = new Map();

		// Reference to middlewares stack.
		this._middlewares = new MiddlewaresStack({ finalhandlerEnabled: !!opts.finalhandlerEnabled });

		// Reference to the markers stack.
		this._markers = new MarkersStack();

		// Reference to the providers stack.
		this._providers = new Map();

		this.codeFileExtensions = commonExtensions.code;
		this.paths = {};

		// Options:
		//	if "codeFileExtensions" was set:
		if (!!opts.codeFileExtensions && Array.isArray(opts.codeFileExtensions)) {
			this.codeFileExtensions = [...opts.codeFileExtensions];
		}

		//	If "controllersPath" was set,
		//	cache all controllers in directory:
		if (!!opts.controllersPath) {
			// Save path.
			this.paths.controllers = opts.controllersPath;

			// Only get files, which have available file extensions:
			const availableFileExtensions = this.codeFileExtensions;
			const fileNames = fs.readdirSync(this.paths.controllers);

			const controllersNames = parseProviderFileNames(fileNames, availableFileExtensions, 'controller');

			for (const { fileName, controllerName } of controllersNames) {
				const controller = require(Path.join(this.paths.controllers, fileName));
				this.addController(controller, controllerName);
			}
		}

		//	If "controllers" were provided as an Object:
		if (!!opts.controllers) {
			ensure(opts.controllers, 'object,required', 'opts.controllers');

			const entities = Object.entities(opts.controllers);
			for (const [controllerName, controllerDefinition] of entities) {
				this.addController(controllerDefinition, controllerName);
			}
		}

		//	If "providersPath" was set,
		//	cache all providers in directory:
		if (!!opts.providersPath) {
			// Save path.
			this.paths.providers = opts.providersPath;

			// Only get files, which have available file extensions:
			const availableFileExtensions = this.codeFileExtensions;
			const fileNames = fs.readdirSync(this.paths.providers);

			const providersNames = parseProviderFileNames(fileNames, availableFileExtensions, 'provider');

			for (const { fileName, providerName } of providersNames) {
				const provider = require(Path.join(this.paths.providers, fileName));
				this.addProvider(provider, providerName);
			}
		}

		//	If "providers" were provided as an Object:
		if (!!opts.providers) {
			ensure(opts.providers, 'object,required', 'opts.providers');

			const entities = Object.entities(opts.providers);
			for (const [providerName, providerDefinition] of entities) {
				this.addProvider(providerDefinition, providerName);
			}
		}
	}

	// Getters:

	/**
	 * @return {MiddlewaresStack}
	 *
	 * @api public
	 */
	get middlewaresStack() {
		return this._middlewares;
	}

	/**
	 * Indicates whether user can add more middlewares or not.
	 *
	 * @return {Boolean} isLocked
	 *
	 * @api public
	 */
	get isLocked() {
		return this._middlewares.isLocked;
	}

	// Getters\

	/*
	 * Adds:
	 * - (controller) new Controller to the stack;
	 * - (middleware) new Middleware to the stack;
	 * - (provider) new Provicer to the stack;
	 * - (marker) new Marker to the stack;
	 * - (route) new Route to the stack;
	 * - (routes) array[Route] to the stack;
	 *
	 * @api public
	 */
	get add() {
		return {
			controller: this.addController.bind(this),
			middleware: this.addMiddleware.bind(this),
			marker: this.addMarker.bind(this),
			provider: this.addProvider.bind(this),
			route: this.addRoute.bind(this),
			routes: this.addRoutes.bind(this),
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
	addController(controller, controllerName=null) {
		try {
			ensure(controller, 'object|function,required', 'controller');

			const controllerType = typeOf(controller);
			const name = controllerName ?? controller?.name ?? controller.constructor.name;

			// If controller was exported as Object:
			if (controllerType === 'Object') {
				this._controllers.set(name, controller);
			}
			// If controller was exported as a constructor function:
			else if (controllerType === 'function') {
				this._controllers.set(name, new controller());
			}
			else {
				const err = new TypeError(`Please check how you exported '${ name }', it should be either Object or a constructor function.`);
				throw err;
			}
		}
		catch(error) {
			Error.captureStackTrace(error, this.addController);
			throw error;
		}
	}


	/*
	 * Adds new middleware to the stack.
	 *
	 * @param {Function} fn
	 * @param {Integer} index (0 or undefined)
	 *
	 * @return {Integer} index of the new middleware
	 *
	 * @api public
	 */
	addMiddleware(fn, index) {
		try {
			ensure(fn, 'function,required', 'fn');
			ensure(index, 'number', 'index');

			return this._middlewares.add(fn, index);
		}
		catch(error) {
			Error.captureStackTrace(error, this.addMiddleware);
			throw error;
		}
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
		try {
			ensure(markerName, 'string,required', 'markerName');
			ensure(fn, 'function,required', 'fn');

			if (markerName.length > 0 && markerName.indexOf('/') > -1) {
				const err = new TypeError(`'markerName' can't contain slashes '/'.`);
				throw err;
			}

			if (this._markers.get(markerName)) {
				const err = new Error(`Marker with a name '${ markerName }' is already set.`);
				throw err;
			}

			this._markers.add(markerName, fn);
		}
		catch(error) {
			Error.captureStackTrace(error, this.addMarker);
			throw error;
		}
	}


	/*
	 * Adds new provider to the providers stack.
	 *
	 * @param {Function|Object} provider
	 * @param {String} providerName
	 *
	 * @api public
	 */
	addProvider(provider, providerName=null) {
		try {
			ensure(provider, 'object|function,required', 'provider');
			ensure(providerName, 'string', 'providerName');

			const providerType = typeOf(provider);
			const name = providerName ?? provider?.name ?? provider.constructor.name;

			// If provider was exported as Object:
			if (providerType === 'Object') {
				this._providers.set(name, provider);
			}
			// If provider was exported as a constructor function:
			else if (providerType === 'function') {
				this._providers.set(name, new provider());
			}
			else {
				const err = new TypeError(`Please check how you exported ${ name }, it should be either Object or constructor function.`);
				throw err;
			}
		}
		catch(error) {
			Error.captureStackTrace(error, this.addProvider);
			throw error;
		}
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
		try {
			ensure(route, 'string,required', 'route');
			ensure(handler, 'object|function,required', 'handler');

			const parsedRoute = new Route(route);
			// Will throw exception if not valid.
			validateParsedRouteMethood(parsedRoute);
			
			const handlerType = typeOf(handler);

			if (handlerType === 'Object' && !this.paths.controllers && !this.paths.providers) {
				const msg = `Please set 'controllersPath' or 'providersPath' during Router initialization.`;
				const err = new TypeError(msg);
				throw err;
			}

			const wrapped = wrapRouteHandler.call(this, parsedRoute, handler);
			return this.addMiddleware(wrapped);
		}
		catch(error) {
			Error.captureStackTrace(error, this.addRoute);
			throw error;
		}
	}


	/*
	 * Loops through provided "routes" object
	 * and adds them throught "addRoute".
	 *
	 * @param {Object} routes
	 *
	 * @api public
	 */
	addRoutes(routes={}) {
		try {
			ensure(routes, 'object,required', 'routes');

			for (const [route, handler] of Object.entries(routes)) {
				this.addRoute(route, handler);
			}
		}
		catch(error) {
			Error.captureStackTrace(error, this.addRoutes);
			throw error;
		}
	}


	/*
	 * Proxy to .add.middleware()
	 *
	 * @param {Function|NodesterRouter} fnOrRouter
	 *
	 * @api public
	 */
	use(fnOrRouter) {
		try {
			ensure(fnOrRouter, 'object|function,required', 'fnOrRouter');

			let fn = fnOrRouter;

			// If Router:
			if (fnOrRouter instanceof NodesterRouter) {
				fn = fnOrRouter.handle.bind(fnOrRouter);
			}

			return this.add.middleware(fn);
		}
		catch(error) {
			Error.captureStackTrace(error, this.use);
			throw error;
		}
	}


	/*
	 * Adds middlewares, which only fires for set marker.
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	only(markerName='') {
		try {
			ensure(markerName, 'string,required', 'markerName');

			const self = this;
			const markerFn = this._markers.get(markerName);

			return {
				route: (route, fn) => MarkerMethods.onlyRoute.call(self, route, fn, markerFn),
				use: (fnOrRouter) => MarkerMethods.onlyUse.call(self, fnOrRouter, markerFn),
			}
		}
		catch(error) {
			Error.captureStackTrace(error, this.only);
			throw error;
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
		this._middlewares.lock();
		debug(`router is locked`);
	}


	/*
	 * Unlocks router.
	 *
	 * @api public
	 */
	unlock() {
		this._middlewares.unlock();
		debug(`router is unlocked`);
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
		try {
			ensure(index, 'number,required', 'index');
			
			this._middlewares.remove(index);
			return this._middlewares.length;
		}
		catch(error) {
			Error.captureStackTrace(error, this.removeMiddleware);
			throw error;
		}
	}
	


	/**
	 * Extends Router & makes sure, that "key" param is not present already.
	 *
	 * @param {String} key
	 * @param {Any} fnOrProperty
	 *
	 * @return {Any} fnOrProperty in Router
	 *
	 * @api public
	 */
	extend(key='', fnOrProperty) {
		ensure(key, 'string,required', 'key');
		ensure(fnOrProperty, 'required', 'fnOrProperty');

		if (typeof this[key] !== 'undefined') {
			const err = new TypeError(`Key '${ key }' is already present in Router instance.`);
			throw err;
		}

		this[key] = fnOrProperty;

		return this[key];
	}
}
