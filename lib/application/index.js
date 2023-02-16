/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const Emitter = require('events');
const MiddlewareStack = require('./MiddlewareStack');
// Server:
const http = require('http');
const request = require('./http/request');
const response = require('./http/response');
// Utils:
const { typeOf } = require('../utils/types.util');
const { merge } = require('../utils/objects.util');
const consl = require('../logger/console');
const debug = require('debug')('nodester:application');


module.exports = class Application extends Emitter {
	
	/**
	 * Initialize a new `Application`.
	 *
	 * @api public
	 */
	constructor(opts={}) {
		super();

		// Fallback port.
		this.port = opts?.port ?? 8080;

		// Reference to middlewares stack.
		this._middlewares = new MiddlewareStack();

		// Reference to the database connection.
		this.database = null;

		// Reference to the http(s) server,
		this.server = null;

		this._hooks = {
			beforeStart: ()=>{}
		};

		// Indicatorors.
		this.isListening = false;
	}

	/*
	 * Expose the prototype that will get set on requests.
	 *
	 * @api public
	 */
	get request() {
		return Object.create(request, {
			app: { configurable: true, enumerable: true, writable: true, value: app }
		})
	}


	/*
	 * Expose the prototype that will get set on responses.
	 *
	 * @api public
	 */
	get response() {
		return Object.create(response, {
			app: { configurable: true, enumerable: true, writable: true, value: app }
		})
	}


	/*
	 * Sets (or overrides):
	 * - (database) main database of the application and tries to make connection
	 * - (router) default Router
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
	 * @param {Sequilize} sequilizeConnection
	 * @param {Boolean} crashOnError
	 * @return {sequilizeConnection.authenticate}
	 *
	 * @public
	 */
	setDatabase(sequilizeConnection, crashOnError=true) {
		try {
			if (!sequilizeConnection) {
				const err = new Error('Connection to database (Sequilize) can not be null or undefined.');
				throw err;
			}

			const result = sequilizeConnection.authenticate();
			this.database = sequilizeConnection;

			return result;
		}
		catch(error) {
			if (crashOnError === true) {
				throw error;
			}
			else {
				consl.error(error);
			}
		}
	}


	/**
	 * Overrides default Router.
	 *
	 * @public
	 */
	setRouter(newRouter) {
		this.router = newRouter.init(this);
	}


	/*
	 * Adds:
	 * - (middleware) new middleware to the stack;
	 *
	 * @api public
	 */
	get add() {
		return {
			middleware: this.addMiddleware.bind(this)
		}
	}


	/*
	 * Adds new middleware to the stack.
	 *
	 * @api public
	 */
	addMiddleware(fn) {
		if (this._middlewares.isLocked === true) {
			const err = new Error(`Can't add more middlewares after application has been started.`);
			throw err;
		}

		this._middlewares.add(fn);
	}


	/*
	 * Proxy to .add().
	 *
	 * @param {Function} fn
	 *
	 * @api public
	 */
	use(fn) {
		return this.add(fn);
	}


	/**
	 * Adds to hooks stack (beforeStart).
	 *
	 * @api public
	 */
	beforeStart(fn) {
		if (typeOf(fn) !== 'function') {
			const err = new TypeError('"fn" argument must be a function');
			throw err;
		}
		this._hooks.beforeStart = fn;

		return this._hooks.beforeStart;
	}


	/**
	 * Return a request handler callback
	 * for node's native http server.
	 *
	 * @return {Function}
	 *
	 * @api public
	 */
	start() {
		try {
			this._hooks.beforeStart.call(this);
		}
		catch(error) {
			console.error('Application did not start due to error.');
			consl.error(error);
			return;
		}

		// Lock middlewares stack.
		this._middlewares.lock();

		return this.handle.bind(this);
	}


	/**
	 * Shorthand for:
	 *
	 *    http.createServer(app.start()).listen(...)
	 *
	 * @param {Int} port
	 * @param {Mixed} ...
	 * @return {import('http').Server}
	 *
	 * @api public
	 */
	listen(port, ...args) {
		// Remember port:
		const _port = port ?? this.port;
		this.port = _port;

		debug(`listen on port ${ this.port }`);

		if (!this.server) {
			this.server = http.createServer(this.start());
		}

		this.isListening = true;
		return this.server.listen(_port, ...args);
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

		return this._middlewares.process(req, res)
	}


	/**
	 * Extends Application & makes sure, that "key" param is not present already.
	 * @param {String} key
	 * @param {Any} fnOrProperty
	 * @return {Any} fnOrProperty in Application
	 *
	 * @api public
	 */
	extend(key='', fnOrProperty) {
		const keys = Object.keys(this);
		if (keys.indexOf(key) > -1) {
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
		if (this.isListening !== true) {
			console.warn('Nothing to stop. Server is not listening.');
			return;
		}

		this.server.close();
		this.isListening = false;
	}
}
