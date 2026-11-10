/**
 * nodester
 * MIT Licensed
 */

'use strict';

const EventEmitter = require('node:events');

const EMPTY_ARRAY = Object.freeze([]);


/**
 * In-process event bus with an optional unique namespace policy.
 *
 * @class
 */
class EventBus {
	constructor(options={}) {
		if (!options || typeof options !== 'object' || Array.isArray(options)) {
			throw new TypeError(`'options' must be an object.`);
		}

		if (
			options.uniqueNamespaces !== undefined
			&& typeof options.uniqueNamespaces !== 'boolean'
		) {
			throw new TypeError(`'options.uniqueNamespaces' must be a boolean.`);
		}

		this._emitter = new EventEmitter();
		this._listeners = new Map();
		this._uniqueNamespaces = options.uniqueNamespaces === true;

		this.listeners = {
			add: this.addListener.bind(this),
			remove: this.removeListener.bind(this),
			has: this.hasListener.bind(this),
			clear: this.clearListener.bind(this)
		};
	}


	/**
	 * Emit data into a namespace.
	 *
	 * @param {string} namespace
	 * @param {*} data
	 *
	 * @return {Promise<*>}
	 *
	 * @access public
	 */
	emit(namespace='', data) {
		_assertNamespace(namespace);

		const registered = this._listeners.get(namespace);
		const listenerCount = Array.isArray(registered)
			? registered.length
			: registered ? 1 : 0;

		if (listenerCount === 0) {
			return Promise.resolve(false);
		}

		return new Promise((resolve, reject) => {
			const packet = {
				data,
				nextIndex: 0,
				remaining: listenerCount,
				results: listenerCount > 1 ? [] : null,
				resolve,
				reject
			};

			const emitted = this._emitter.emit(namespace, packet);
			if (!emitted) {
				resolve(false);
			}
		});
	}


	/**
	 * Add a listener pipeline to a namespace.
	 *
	 * @param {string} namespace
	 * @param {Object} definition
	 * @param {Function|Function[]} [definition.before]
	 * @param {Function} definition.run
	 *
	 * @return {EventBus}
	 *
	 * @access public
	 */
	addListener(namespace='', definition={}) {
		_assertNamespace(namespace);

		if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
			throw new TypeError(`'definition' must be an object.`);
		}

		if (typeof definition.run !== 'function') {
			throw new TypeError(`'definition.run' must be a function.`);
		}

		if (this._uniqueNamespaces && this._listeners.has(namespace)) {
			throw _duplicateNamespaceError(namespace);
		}

		const before = _normalizeBefore(definition.before);
		const listener = this._compileListener(namespace, before, definition.run);
		let registered = false;

		if (this._uniqueNamespaces) {
			// EventEmitter emits `newListener` before adding the listener. The
			// one-shot assertion enforces uniqueness at the emitter boundary.
			this._emitter.once('newListener', (eventName, addedListener) => {
				if (eventName !== namespace || addedListener !== listener) {
					return;
				}

				if (this._listeners.has(namespace)) {
					throw _duplicateNamespaceError(namespace);
				}

				registered = true;
			});
		}

		this._emitter.on(namespace, listener);

		if (this._uniqueNamespaces && !registered) {
			throw new Error(`Could not register listener for namespace '${ namespace }'.`);
		}

		if (this._uniqueNamespaces) {
			this._listeners.set(namespace, listener);
		}
		else {
			const namespaceListeners = this._listeners.get(namespace) ?? [];
			namespaceListeners.push(listener);
			this._listeners.set(namespace, namespaceListeners);
		}

		return this;
	}


	/**
	 * Remove all listener pipelines registered for a namespace.
	 *
	 * @param {string} namespace
	 *
	 * @return {boolean}
	 *
	 * @access public
	 */
	removeListener(namespace='') {
		_assertNamespace(namespace);

		const registered = this._listeners.get(namespace);
		if (!registered) {
			return false;
		}

		const listeners = Array.isArray(registered) ? registered : [registered];
		for (const listener of listeners) {
			this._emitter.removeListener(namespace, listener);
		}

		this._listeners.delete(namespace);
		return true;
	}


	/**
	 * Check whether a namespace has one or more listener pipelines.
	 *
	 * @param {string} namespace
	 *
	 * @return {boolean}
	 *
	 * @access public
	 */
	hasListener(namespace='') {
		_assertNamespace(namespace);
		return this._listeners.has(namespace);
	}


	/**
	 * Remove all listener pipelines registered for a namespace.
	 *
	 * @param {string} namespace
	 *
	 * @return {EventBus}
	 *
	 * @access public
	 */
	clearListener(namespace='') {
		this.removeListener(namespace);
		return this;
	}


	/**
	 * Compile a listener once at registration time.
	 *
	 * @param {string} namespace
	 * @param {Function[]} before
	 * @param {Function} run
	 *
	 * @return {Function}
	 *
	 * @access private
	 */
	_compileListener(namespace, before, run) {
		return function _compiledListener(packet) {
			const context = _createContext(namespace, packet.data);
			const resultIndex = packet.nextIndex++;
			let result;

			try {
				result = _execute(context.ctx, before, run, context.frames);
			}
			catch (error) {
				packet.reject(error);
				return;
			}

			_settle(packet, result, resultIndex);
		};
	}
}


/**
 * Create a fixed-shape context shared by one emission's pipeline.
 *
 * Only `data` and `state` are writable. `namespace` and `next` are immutable,
 * and the context cannot receive additional top-level properties.
 *
 * @param {string} namespace
 * @param {*} data
 *
 * @return {Object}
 *
 * @access private
 */
function _createContext(namespace, data) {
	const frames = [];
	const context = {};

	const _next = () => {
		const frame = frames[frames.length - 1];

		if (!frame || frame.called) {
			return frame?.result;
		}

		frame.called = true;
		frame.result = _executeFrom(
			context,
			frame.middleware,
			frame.run,
			frames,
			frame.index + 1
		);
		return frame.result;
	};

	Object.defineProperties(context, {
		namespace: {
			configurable: false,
			enumerable: true,
			writable: false,
			value: namespace
		},
		data: {
			configurable: false,
			enumerable: true,
			writable: true,
			value: data
		},
		state: {
			configurable: false,
			enumerable: true,
			writable: true,
			value: Object.create(null)
		},
		next: {
			configurable: false,
			enumerable: true,
			writable: false,
			value: _next
		}
	});

	Object.preventExtensions(context);
	return { ctx: context, frames };
}


/**
 * Execute a complete middleware pipeline.
 *
 * Middleware return values do not control flow. Only calling `next()` moves
 * execution to the next middleware or runner.
 *
 * @param {Object} context
 * @param {Function[]} middleware
 * @param {Function} run
 * @param {Array} frames
 *
 * @return {*}
 *
 * @access private
 */
function _execute(context, middleware, run, frames) {
	return _executeFrom(context, middleware, run, frames, 0);
}


/**
 * Execute the pipeline from a middleware index.
 *
 * @param {Object} context
 * @param {Function[]} middleware
 * @param {Function} run
 * @param {Array} frames
 * @param {number} index
 *
 * @return {*}
 *
 * @access private
 */
function _executeFrom(context, middleware, run, frames, index) {
	if (index >= middleware.length) {
		return run(context);
	}

	const frame = {
		called: false,
		index,
		middleware,
		run,
		result: undefined
	};

	frames.push(frame);

	let returned;
	try {
		returned = middleware[index](context, context.next);
	}
	catch (error) {
		frames.pop();
		throw error;
	}

	if (_isThenable(returned)) {
		return Promise.resolve(returned).then(() => {
			frames.pop();
			return frame.called ? frame.result : undefined;
		}, error => {
			frames.pop();
			throw error;
		});
	}

	frames.pop();
	return frame.called ? frame.result : undefined;
}


/**
 * Resolve either a synchronous value or an asynchronous pipeline result.
 *
 * @param {Object} packet
 * @param {*} result
 * @param {number} resultIndex
 *
 * @access private
 */
function _settle(packet, result, resultIndex) {
	if (_isThenable(result)) {
		result.then(
			value => _finish(packet, value, resultIndex),
			packet.reject
		);
		return;
	}

	_finish(packet, result, resultIndex);
}


/**
 * Resolve a packet after all registered listeners complete.
 *
 * @param {Object} packet
 * @param {*} result
 * @param {number} resultIndex
 *
 * @access private
 */
function _finish(packet, result, resultIndex) {
	if (packet.results) {
		packet.results[resultIndex] = result;
	}

	packet.remaining -= 1;
	if (packet.remaining > 0) {
		return;
	}

	packet.resolve(packet.results ?? result);
}


/**
 * @param {*} value
 *
 * @return {boolean}
 *
 * @access private
 */
function _isThenable(value) {
	return value !== null
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function';
}


/**
 * @param {*} before
 *
 * @return {Function[]}
 *
 * @access private
 */
function _normalizeBefore(before) {
	if (before === undefined || before === null) {
		return EMPTY_ARRAY;
	}

	const middlewares = Array.isArray(before) ? before.slice() : [before];
	for (const middleware of middlewares) {
		if (typeof middleware !== 'function') {
			throw new TypeError(`'definition.before' must contain only functions.`);
		}
	}

	return Object.freeze(middlewares);
}


/**
 * @param {*} namespace
 *
 * @access private
 */
function _assertNamespace(namespace) {
	if (typeof namespace !== 'string' || namespace.length === 0) {
		throw new TypeError(`'namespace' must be a non-empty string.`);
	}

	if (namespace === 'newListener' || namespace === 'removeListener') {
		throw new TypeError(`Namespace '${ namespace }' is reserved by EventEmitter.`);
	}
}


/**
 * @param {string} namespace
 *
 * @return {TypeError}
 *
 * @access private
 */
function _duplicateNamespaceError(namespace) {
	return new TypeError(`Listener for namespace '${ namespace }' already exists.`);
}


module.exports = EventBus;
