'use strict';

const { EventBus } = require('../lib/events');


describe('EventBus', () => {
	it('runs a listener when before is omitted', async () => {
		const bus = new EventBus();

		bus.listeners.add('plain', {
			run: ctx => ctx.data
		});

		await expect(bus.emit('plain', { value: 1 })).resolves.toEqual({ value: 1 });
	});


	it('runs a namespace listener and exposes mutable data and state', async () => {
		const bus = new EventBus();
		const data = { userId: 42 };

		bus.listeners.add('users', {
			before: (ctx, next) => {
				ctx.data.loaded = true;
				ctx.state.user = { id: ctx.data.userId };
				next();
			},
			run: ctx => ({
				data: ctx.data,
				state: ctx.state
			})
		});

		await expect(bus.emit('users', data)).resolves.toEqual({
			data: {
				userId: 42,
				loaded: true
			},
			state: {
				user: { id: 42 }
			}
		});
	});


	it('allows middleware to replace data and state', async () => {
		const bus = new EventBus();

		bus.listeners.add('replace', {
			before: [
				(ctx, next) => {
					ctx.data = { value: 2 };
					ctx.state = { changed: true };
					next();
				}
			],
			run: ctx => ({ data: ctx.data, state: ctx.state })
		});

		await expect(bus.emit('replace', { value: 1 })).resolves.toEqual({
			data: { value: 2 },
			state: { changed: true }
		});
	});


	it('stops when middleware does not call next', async () => {
		const bus = new EventBus();
		const run = jest.fn();

		bus.listeners.add('blocked', {
			before: () => {},
			run
		});

		await expect(bus.emit('blocked', {})).resolves.toBeUndefined();
		expect(run).not.toHaveBeenCalled();
	});


	it('does not continue based on middleware return values', async () => {
		const bus = new EventBus();
		const run = jest.fn();

		bus.listeners.add('returned', {
			before: () => true,
			run
		});

		await bus.emit('returned', {});
		expect(run).not.toHaveBeenCalled();
	});


	it('runs async middleware and runners in order', async () => {
		const bus = new EventBus();
		const order = [];

		bus.listeners.add('async', {
			before: [
				async (ctx, next) => {
					await Promise.resolve();
					order.push('before-1');
					next();
				},
				(ctx, next) => {
					order.push('before-2');
					next();
				}
			],
			run: async () => {
				await Promise.resolve();
				order.push('run');
				return 'done';
			}
		});

		await expect(bus.emit('async', {})).resolves.toBe('done');
		expect(order).toEqual(['before-1', 'before-2', 'run']);
	});


	it('keeps namespace and next immutable', async () => {
		const bus = new EventBus();
		let context;

		bus.listeners.add('immutable', {
			before: (ctx, next) => {
				context = ctx;
				try {
					ctx.namespace = 'changed';
					ctx.next = null;
				}
				catch (error) {
					// Strict-mode assignment to readonly properties may throw.
				}
				next();
			},
			run: () => undefined
		});

		await bus.emit('immutable', {});

		expect(context.namespace).toBe('immutable');
		expect(typeof context.next).toBe('function');
		expect(Object.isExtensible(context)).toBe(false);
		expect(Object.getOwnPropertyDescriptor(context, 'namespace').writable).toBe(false);
		expect(Object.getOwnPropertyDescriptor(context, 'next').writable).toBe(false);
		expect(Object.getOwnPropertyDescriptor(context, 'data').writable).toBe(true);
		expect(Object.getOwnPropertyDescriptor(context, 'state').writable).toBe(true);
	});


	it('passes the immutable context next function as the middleware next argument', async () => {
		const bus = new EventBus();
		let contextNext;

		bus.listeners.add('next', {
			before: (ctx, next) => {
				contextNext = [ctx.next, next];
				next();
			},
			run: () => undefined
		});

		await bus.emit('next', {});

		expect(contextNext[0]).toBe(contextNext[1]);
	});


	it('allows only one listener per namespace', () => {
		const bus = new EventBus({ uniqueNamespaces: true });

		bus.listeners.add('unique', { run: () => {} });

		expect(() => {
			bus.listeners.add('unique', { run: () => {} });
		}).toThrow(`Listener for namespace 'unique' already exists.`);
	});


	it('allows a namespace to be registered again after removal', () => {
		const bus = new EventBus();

		bus.listeners.add('replaceable', { run: () => 'first' });
		expect(bus.listeners.remove('replaceable')).toBe(true);

		bus.listeners.add('replaceable', { run: () => 'second' });
		expect(bus.listeners.has('replaceable')).toBe(true);
	});


	it('resolves false when no listener exists', async () => {
		const bus = new EventBus();

		await expect(bus.emit('missing', {})).resolves.toBe(false);
	});


	it('creates an independent context for every emission', async () => {
		const bus = new EventBus();
		const states = [];

		bus.listeners.add('isolated', {
			before: (ctx, next) => {
				ctx.state.id = ctx.data.id;
				next();
			},
			run: ctx => {
				states.push(ctx.state);
			}
		});

		await Promise.all([
			bus.emit('isolated', { id: 1 }),
			bus.emit('isolated', { id: 2 })
		]);

		expect(states).toHaveLength(2);
		expect(states[0]).not.toBe(states[1]);
		expect(states).toEqual([{ id: 1 }, { id: 2 }]);
	});


	it('rejects when middleware or the runner throws', async () => {
		const middlewareError = new Error('middleware failed');
		const runnerError = new Error('runner failed');
		const middlewareBus = new EventBus();
		const runnerBus = new EventBus();

		middlewareBus.listeners.add('middleware-error', {
			before: () => {
				throw middlewareError;
			},
			run: () => undefined
		});
		runnerBus.listeners.add('runner-error', {
			run: () => {
				throw runnerError;
			}
		});

		await expect(middlewareBus.emit('middleware-error', {})).rejects.toBe(middlewareError);
		await expect(runnerBus.emit('runner-error', {})).rejects.toBe(runnerError);
	});


	it('allows multiple listeners by default', async () => {
		const bus = new EventBus();

		bus.listeners.add('shared', {
			run: () => 'first'
		});
		bus.listeners.add('shared', {
			run: async () => 'second'
		});

		await expect(bus.emit('shared', {})).resolves.toEqual(['first', 'second']);
	});


	it('validates the namespace uniqueness option', () => {
		expect(() => new EventBus({ uniqueNamespaces: 'yes' }))
			.toThrow(`'options.uniqueNamespaces' must be a boolean.`);
	});
});
