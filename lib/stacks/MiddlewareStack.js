/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const finalhandler = require('finalhandler');
const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:MiddlewareStack');


module.exports = class MiddlewareStack {
	constructor(opts={}) {
		// This array MUST stay flat!
		this.middlewares = [];

		// Indicates whether we can add more middlewares or no.
		this.isLocked = false;
		this.finalhandlerEnabled = !!opts.finalhandlerEnabled;


		const env = process.env.NODE_ENV || 'development';
		// Final middleware & error handler.
		this.finalhandler = (req, res) => finalhandler(req, res, {
			env: env,
			onerror: consl.error.bind(this)
		});
	}


	/**
	 * Add the given middleware `fn` to the stack.
	 *
	 * @param {Function} fn
	 * @param {Integer} index (0 or undefined)
	 * @return {Integer} index of new middleware
	 *
	 * @api public
	 */
	add(fn, index) {
		if (this.isLocked) {
			const err = new Error(`Can't add more middlewares while stack is locked.`);
			throw err;
		}

		if (typeof fn !== 'function') {
			const err = new TypeError('middleware must be a function!');
			throw err;
		}

		if (!!index && isNaN(index)) {
			const err = new TypeError('"index" must be an Integer!');
			throw err;
		}

		let pushedIndex = -1;

		if (index === 0) {
			this.middlewares.unshift(fn);
			pushedIndex = 0;
		}
		else {
			pushedIndex = this.middlewares.push(fn);
		}

		debug(`added middleware (${ pushedIndex })`);
		return pushedIndex;
	}


	/**
	 * Removes middleware at index.
	 *
	 * @param {Integer} index
	 * @return {MiddlewareStack} self
	 *
	 * @api public
	 */
	remove(index=-1) {
		if (this.isLocked) {
			const err = new Error(`Can't remove middlewares while stack is locked.`);
			throw err;
		}

		if (isNaN(index)) {
			const err = new TypeError('"index" must be an Integer!');
			throw err;
		}

		this.middlewares.splice(index, 1);
		debug(`removed middleware (${ index })`);
		return this;
	}


	/*
	 * Prepare stack for processing.
	 *
	 * @api public
	 */
	lock() {
		if (this.finalhandlerEnabled) {
			// Add final handler to the stack.
			this.add((req, res)=>this.finalhandler(req, res)());
		}

		// Stack is ready.
		this.isLocked = true;

		debug(`stack is locked`);
	}


	/*
	 * Unlocks stack.
	 *
	 * @api public
	 */
	unlock() {
		this.isLocked = false;
		
		if (this.finalhandlerEnabled) {
			this.middlewares.pop();
		}

		debug(`stack is unlocked`);
	}


	/*
	 * Start chain.
	 *
	 * @api public
	 */
	process(req, res, next) {
		let middlewareOffset = -1;

		const _next = (...args) => {
			middlewareOffset += 1;
			const fn = this.middlewares[middlewareOffset];

			try {
				if (!fn && !next) {
					const err = new TypeError(`Handler for ${ req.method } ${ req.url } is not defined.`);
					throw err;
				}
				else if (!fn && !!next) {
					return next.call(null, req, res, next, ...args);
				}

				return fn.call(null, req, res, _next, ...args);
			}
			catch(error) {
				return this.finalhandler(req, res)(error);
			}
		}

		return _next();
	}


	get length() {
		return this.middlewares.length;
	}
}
