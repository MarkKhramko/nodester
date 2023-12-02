/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const Emitter = require('events');
const NodesterRouter = require('../router');

// Server:
const http = require('http');
const request = require('../http/request');
const response = require('../http/response');

// Middlewares:
const bodyParser = require('body-parser');
const cookies = require('nodester/middlewares/cookies');
const nodesterQL = require('nodester/ql/sequelize');

// DB setup.
const { associateModels } = require('nodester/models/associate');

// Utils:
const Params = require('nodester/params');
const {
	typeOf,
	isConstructor
} = require('../utils/types.util');
const { merge } = require('../utils/objects.util');

// Arguments validator.
const { ensure } = require('../validators/arguments');

// Console:
const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:application');


module.exports = class NodesterApplication extends Emitter {
	
	/**
	 * Initialize new `NodesterApplication`.
	 *
	 * @param {Object}     [options]
	 * @param {String|Int} options.port
	 * @param {String}     options.title
	 * @param {Boolean}    options.finalhandlerEnabled
	 * @param {Object}     options.middlewares
	 *
	 * @api public
	 */
	constructor(options={}) {
		super();

		ensure(options, 'object', 'options');

		// Unwrap options:
		const {
			port,
			title,
			finalhandlerEnabled,
			middlewares
		} = Params((options ?? {}), {
			port: 8080,
			title: null,
			finalhandlerEnabled: true,
			middlewares: {}
		});


		// Fallback port.
		this.port = port;

		// Router acts as a MiddlewareStack for the application.
		this._router = new NodesterRouter({ finalhandlerEnabled });

		// Reference to the database connection.
		this._database = null;

		// Reference to the http(s) server,
		this.server = null;

		this._hooks = {
			beforeStart: ()=>{}
		};

		// Default middlewares:
		const _withoutMiddlewares = middlewares?.without ?? [];

		// !WARNING: Order of middlewares is important:

		if (_withoutMiddlewares.indexOf('nodester-ql') === -1) {
			this.use(nodesterQL());
		}

		if (_withoutMiddlewares.indexOf('body-parser') === -1) {
			this.use(bodyParser.json());
		}

		if (_withoutMiddlewares.indexOf('cookies') === -1) {
			this.use(cookies());
		}

		// User can title their application:
		if (!!title) {
			// Rename CLI process.
			process.title = title;
		}

		// Indicatorors.
		this._isListening = false;
	}

	// Getters:

	/**
	 * @return {MiddlewaresStack}
	 *
	 * @api public
	 */
	get middlewaresStack() {
		return this._router.middlewaresStack;
	}

	/**
	 * Indicates whether user can add more middlewares or not.
	 *
	 * @return {Boolean} isLocked
	 *
	 * @api public
	 */
	get isLocked() {
		return this._router.isLocked;
	}

	/**
	 * Indicates whether app is awaiting requests.
	 *
	 * @return {Boolean} isListening
	 *
	 * @api public
	 */
	get isListening() {
		return this._isListening;
	}

	// Getters\

	/*
	 * Expose the prototype that will get set on requests.
	 *
	 * @api public
	 */
	get request() {
		return Object.create(request, {
			app: { configurable: true, enumerable: true, writable: true, value: this }
		})
	}


	/*
	 * Expose the prototype that will get set on responses.
	 *
	 * @api public
	 */
	get response() {
		return Object.create(response, {
			app: { configurable: true, enumerable: true, writable: true, value: this }
		})
	}


	/*
	 * Sets (or overrides):
	 * - (database) main database of the application and tries to make connection
	 * - (router) default NodesterRouter
	 *
	 * @api public
	 */
	get set() {
		return {
			database: this.setDatabase.bind(this),
			router: this.setRouter.bind(this)
		}
	}


	/**
	 * Sets (or overrides) main database of the application and tries to make connection.
	 *
	 * @param {Sequilize} sequilizeConnection
	 * @param {Object}  [options]
	 * @param {Boolean} options.associateModels
	 * @param {Boolean} options.crashOnError
	 *
	 * @return {sequilizeConnection.authenticate}
	 *
	 * @api public
	 */
	async setDatabase(sequilizeConnection, options={}) {
		try {
			if (!sequilizeConnection) {
				const err = new TypeError('Connection to a database (Sequilize) can not be null or undefined.');
				throw err;
			}

			if (this._isListening === true) {
				const err = new Error(`Can't set database after an application start.`);
				throw err;
			}

			// Test connection.
			const result = await sequilizeConnection.authenticate();

			if (options?.associateModels === true) {
				// Associate models between each other.
				await associateModels(sequilizeConnection);	
			}
			
			// Set database.
			this._database = sequilizeConnection;

			return Promise.resolve(result);
		}
		catch(error) {
			if (options?.crashOnError === true) {
				Error.captureStackTrace(error, this.setDatabase);
				throw error;
			}
			else {
				consl.error(error);
			}

			return Promise.reject(error);
		}
	}


	/*
	 * Returns main database of the application.
	 *
	 * @return {SequilizeConnection} database
	 *
	 * @api public
	 */
	get database() {
		return this._database;
	}


	/**
	 * Overrides default Router.
	 *
	 * @param {NodesterRouter} newRouter
	 *
	 * @api public
	 */
	setRouter(newRouter) {
		if (isConstructor(newRouter)) {
			this._router = new newRouter();
		}
		else {
			this._router = newRouter;
		}
	}


	/*
	 * Returns NodesterRouter object.
	 *
	 * @return {NodesterRouter}
	 *
	 * @api public
	 */
	get router() {
		return this._router;
	}


	/*
	 * Adds:
	 * - (middleware) new middleware to the stack;
	 *
	 * @api public
	 */
	get add() {
		return {
			controller: this._router.add.controller,
			middleware: this._router.add.middleware,
			marker: this._router.add.marker,
			route: this._router.add.route,
		}
	}


	/*
	 * Proxy to router.use()
	 *
	 * @param {Function|NodesterRouter} fnOrRouter
	 *
	 * @api public
	 */
	use(fnOrRouter) {
		try {
			ensure(fnOrRouter, 'object|function,required', 'fnOrRouter');
		
			return this._router.use(fnOrRouter);
		}
		catch(error) {
			Error.captureStackTrace(error, this.use);
			throw error;
		}
	}


	/*
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	only(markerName='') {
		try {
			ensure(markerName, 'string,required', 'markerName');

			return this._router.only(markerName);
		}
		catch(error) {
			Error.captureStackTrace(error, this.only);
			throw error;
		}
	}


	/**
	 * Sets beforeStart hook.
	 *
	 * @api public
	 */
	beforeStart(fn) {
		try {
			ensure(fn, 'function,required', 'fn');

			this._hooks.beforeStart = fn;
			return this._hooks.beforeStart;
		}
		catch(error) {
			Error.captureStackTrace(error, this.beforeStart);
			throw error;
		}
	}


	/**
	 * Return a request handler callback
	 * for node's native http server.
	 *
	 * @return {Function}
	 *
	 * @api public
	 */
	async start() {
		try {
			await this._hooks.beforeStart.call(this);
		}
		catch(error) {
			console.error('NodesterApplication did not start due to error.');
			consl.error(error);

			Error.captureStackTrace(error, this.start);
			return Promise.reject(error);
		}


		try {
			// Prepare router for processing.
			this._router.lock();

			const handler = this.handle.bind(this);
			return handler;
		}
		catch(error) {
			Error.captureStackTrace(error, this.start);
			return Promise.reject(error);
		}
	}


	/**
	 * Shorthand for:
	 *
	 *    http.createServer(app.start()).listen(...)
	 *
	 * @param {Integer|String} port
	 * @param {Mixed} ...
	 *
	 * @return {import('http').Server}
	 *
	 * @api public
	 */
	async listen(port, ...args) {
		try {
			ensure(port, 'number|string,required', 'port');

			// Remember port:
			const _port = port ?? this.port;
			this.port = _port;

			debug(`listen on port ${ this.port }`);

			if (!this.server) {
				const handler = await this.start();
				this.server = http.createServer(handler);
			}

			this._isListening = true;
			return this.server.listen(_port, ...args);
		}
		catch(error) {
			Error.captureStackTrace(error, this.listen);
			throw error;
		}
	}


	/**
	 * Handles server request.
	 *
	 * @api public
	 */
	handle(req, res) {
		// Req & res with mixins:
		merge(req, this.request);
		merge(res, this.response);

		// Exchange references:
		req.res = res;
		res.req = req;

		return this._router.handle(req, res);
	}


	/**
	 * Extends Application & makes sure, that "key" param is not present already.
	 *
	 * @param {String} key
	 * @param {Any} fnOrProperty
	 *
	 * @return {Any} fnOrProperty in Application
	 *
	 * @api public
	 */
	extend(key='', fnOrProperty) {
		ensure(key, 'string,required', 'key');
		ensure(fnOrProperty, 'required', 'fnOrProperty');

		if (typeof this[key] !== 'undefined') {
			const err = new TypeError(`Key ${ key } is already present in Application instance`);
			throw err;
		}

		this[key] = fnOrProperty;

		return this[key];
	}


	/**
	 * Stops server
	 *
	 * @api public
	 */
	stop() {
		if (this._isListening !== true) {
			console.warn('Nothing to stop. Server is not listening.');
			return;
		}

		this.server.close();
		this._isListening = false;

		this._router.unlock();
	}
}
