/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const Emitter = require('events');
const DefaultRouter = require('../router');
// Server:
const http = require('http');
const request = require('../http/request');
const response = require('../http/response');
// Middlewares:
const nodesterQL = require('../middlewares/ql/sequelize');
// Utils:
const {
	typeOf,
	isConstructor
} = require('../utils/types.util');
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

		// Reference to router.
		this._router = new DefaultRouter({ finalhandlerEnabled: true });

		// Reference to the database connection.
		this._database = null;

		// Reference to the Query parser.
		this._queryParser = nodesterQL;

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
	 *
	 * @param {Sequilize} sequilizeConnection
	 * @param {Boolean} crashOnError
	 * @return {sequilizeConnection.authenticate}
	 *
	 * @public
	 */
	setDatabase(sequilizeConnection, crashOnError=true) {
		try {
			if (!sequilizeConnection) {
				const err = new TypeError('Connection to database (Sequilize) can not be null or undefined.');
				throw err;
			}

			if (this.isListening === true) {
				const err = new Error(`Can't set database after application start.`);
				throw err;
			}

			const result = sequilizeConnection.authenticate();
			this._database = sequilizeConnection;

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


	/*
	 * Returns main database of the application.
	 *
	 * @return {SequilizeConnection}
	 *
	 * @public
	 */
	get database() {
		return this._database;
	}


	/**
	 * Overrides default Router.
	 *
	 * @public
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
	 * @public
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
	 * Proxy to .add.middleware()
	 *
	 * @param {Function} fn
	 *
	 * @api public
	 */
	use(fn) {
		return this._router.add.middleware(fn);
	}


	/*
	 *
	 * @param {String} markerName
	 *
	 * @api public
	 */
	only(markerName='') {
		return this._router.only(markerName);
	}


	/**
	 * Sets beforeStart hook.
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
	async start() {
		try {
			await this._hooks.beforeStart.call(this);
		}
		catch(error) {
			console.error('Application did not start due to error.');
			consl.error(error);
			return Promise.reject(error);
		}

		// Add query parser.
		this._router.add.middleware(this._queryParser, 0);

		// Prepare router for processing.
		this._router.lock();

		const handler = this.handle.bind(this);
		return handler;
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
	async listen(port, ...args) {
		// Remember port:
		const _port = port ?? this.port;
		this.port = _port;

		debug(`listen on port ${ this.port }`);

		if (!this.server) {
			const handler = await this.start();
			this.server = http.createServer(handler);
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

		return this._router.handle(req, res);
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

		this._router.unlock();
		// Remove query parser.
		this._router.remove.middleware(0);
	}
}
