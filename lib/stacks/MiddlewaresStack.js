/*!
 * /nodester
 * MIT Licensed
 */

'use strict';

const finalhandler = require('finalhandler');

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');

// Console:
const consl = require('nodester/loggers/console');
const debug = require('debug')('nodester:MiddlewaresStack');


/*
 * Creates new MiddlewaresStack.
 *
 * @param {Object}  [opts]
 * @param {Boolean} opts.finalhandlerEnabled
 *
 * @return {MiddlewaresStack}
 *
 */
module.exports = class MiddlewaresStack {
	constructor(opts={}) {
		// This array MUST stay flat!
		this._middlewares = [];

		// Indicates whether we can add more middlewares or no.
		this._isLocked = false;
		this.finalhandlerEnabled = !!opts.finalhandlerEnabled;


		const env = process.env.NODE_ENV || 'development';
		// Final middleware & error handler.
		this.finalhandler = (req, res) => finalhandler(req, res, {
			env: env,
			onerror: consl.error.bind(this)
		});
	}

	// Getters:
	get middlewares() {
		return this._middlewares;
	}

	get length() {
		return this._middlewares.length;
	}

	/**
	 * Indicates whether user can add more middlewares or not.
	 *
	 * @return {Boolean} isLocked
	 *
	 * @api public
	 */
	get isLocked() {
		return this._isLocked === true;
	}
	// Getters\


	/**
	 * Add the given middleware `fn` to the stack.
	 *
	 * @param {Function} fn
	 * @param {Integer} index (0 or undefined)
	 *
	 * @return {Integer} index of the new middleware
	 *
	 * @api public
	 */
	add(fn, index) {
		try {
			ensure(fn, 'function,required', 'fn');
			ensure(index, 'number', 'index');

			if (this._isLocked) {
				const err = new Error(`Can't add more middlewares while stack is locked.`);
				throw err;
			}

			let pushedIndex = -1;

			if (index === 0) {
				this._middlewares.unshift(fn);
				pushedIndex = 0;
			}
			else {
				pushedIndex = this.middlewares.push(fn);
			}

			debug(`added middleware (${ pushedIndex })`);
			return pushedIndex;
		}
		catch(error) {
			Error.captureStackTrace(error, this.add);
			throw error;
		}
	}


	/**
	 * Removes middleware at index.
	 *
	 * @param {Integer} index
	 *
	 * @return {MiddlewaresStack} self
	 *
	 * @api public
	 */
	remove(index=-1) {
		try {
			ensure(index, 'number,required', 'index');

			if (this._isLocked) {
				const err = new Error(`Can't remove middlewares while stack is locked.`);
				throw err;
			}

			this._middlewares.splice(index, 1);
			debug(`removed middleware (${ index })`);
			return this;
		}
		catch(error) {
			Error.captureStackTrace(error, this.remove);
			throw error;
		}
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
		this._isLocked = true;

		debug(`stack is locked`);
	}


	/*
	 * Unlocks stack.
	 *
	 * @api public
	 */
	unlock() {
		this._isLocked = false;
		
		if (this.finalhandlerEnabled) {
			this._middlewares.pop();
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

		const _next = async (...args) => {
			middlewareOffset += 1;
			const fn = this._middlewares[middlewareOffset];

			try {
				if (!fn && !!next) {
					// Middlewares stack is finished:
					return next.call(null, req, res, next, ...args);
				}
				else if (!!fn) {
					return await fn.call(null, req, res, _next, ...args);
				}
			}
			catch(error) {
				return this.finalhandler(req, res)(error);
			}
		}

		// Initial start:
		return _next();
	}

}
