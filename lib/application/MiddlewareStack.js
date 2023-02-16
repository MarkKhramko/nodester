const finalhandler = require('finalhandler');
const consl = require('../logger/console');
const debug = require('debug')('nodester:MiddlewareStack');


module.exports = class MiddlewareStack {
	constructor() {
		// This array MUST stay flat!
		this.middlewares = [];

		// Indicates whether we can add more middlewares or no.
		this.isLocked = false;


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
	 * @return {Integer} index of new middleware
	 *
	 * @api public
	 */
	add(fn) {
		if (this.isLocked) {
			const err = new Error(`Can't add more middlewares while stack is locked.`);
			throw err;
		}

		if (typeof fn !== 'function') {
			const err = new TypeError('middleware must be a function!');
			throw err;
		}

		const index = this.middlewares.push(fn);
		debug(`added middleware (${ index })`);
		return index;
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

		this.middlewares.splice(middlewareIndex, 1);
		debug(`removed middleware (${ index })`);
		return this;
	}


	/*
	 * Prepare stack for processing.
	 *
	 * @api public
	 */
	lock() {
		// Add final handler to the stack.
		this.add((req, res)=>this.finalhandler(req, res)());

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
		this.middlewares.pop();

		debug(`stack is unlocked`);
	}


	/*
	 * Start chain.
	 *
	 * @api public
	 */
	process(req, res) {
		let middlewareOffset = -1;

		const next = (...args) => {
			middlewareOffset += 1;
			const fn = this.middlewares[middlewareOffset];

			try {
				return fn.call(null, req, res, next, ...args);
			}
			catch(error) {
				return this.finalhandler(req, res)(error);
			}
		}

		return next();
	}
}
