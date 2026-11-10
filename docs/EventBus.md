# EventBus | nodester

## Usage

```js
const { EventBus } = require('nodester/events');

const bus = new EventBus();
```

Add a listener for a namespace:

```js
bus.listeners.add('users', {
  run: (ctx) => {
    console.log(ctx.data);
  }
});
```

Emit data into the namespace:

```js
await bus.emit('users', {
  type: 'created',
  userId: 17
});
```

The returned Promise resolves with the value returned by `run`.

## Middleware

You can add middleware before the listener runner:

```js
bus.listeners.add('users', {
  before: (ctx, next) => {
    if (!ctx.data.userId) {
      return;
    }

    ctx.state.valid = true;
    next();
  },
  run: (ctx) => {
    console.log('User event:', ctx.data);
  }
});
```

The `before` property is optional and can be either a function or an array of functions:

```js
bus.listeners.add('users', {
  before: [authenticate, validate],
  run: processUserEvent
});
```

Only calling `next()` continues the middleware chain. Return values do not continue processing. If middleware does not call `next()`, the next middleware and `run` are not called.

## Context

Every emission creates a new context:

```js
{
  namespace,
  data,
  state,
  next
}
```

Middleware can replace or modify `data` and `state`:

```js
bus.listeners.add('orders', {
  before: async (ctx, next) => {
    ctx.data = await normalizeOrder(ctx.data);
    ctx.state.order = await loadOrder(ctx.data.orderId);
    next();
  },
  run: (ctx) => {
    return saveOrderProjection(ctx.state.order);
  }
});
```

`namespace` and `next` are immutable. The context cannot receive additional top-level properties.

## Multiple listeners

By default, multiple listeners can be added to the same namespace:

```js
bus.listeners.add('users', {
  run: updateSearchIndex
});

bus.listeners.add('users', {
  run: sendWelcomeEmail
});
```

All listeners are called in registration order. When more than one listener exists, `emit` resolves with an array of runner results in the same order.

## Unique namespaces

To allow only one listener per namespace, enable the option during initialization:

```js
const bus = new EventBus({
  uniqueNamespaces: true
});

bus.listeners.add('users', { run: firstListener });
bus.listeners.add('users', { run: secondListener });
// Throws because the 'users' namespace already has a listener.
```

## Asynchronous listeners

Middleware and runners can be synchronous or asynchronous:

```js
bus.listeners.add('payments', {
  before: async (ctx, next) => {
    ctx.state.payment = await loadPayment(ctx.data.paymentId);
    next();
  },
  run: async (ctx) => {
    return chargePayment(ctx.state.payment);
  }
});

await bus.emit('payments', {
  paymentId: 17
});
```

Errors thrown by middleware or `run` reject the Promise returned by `emit`:

```js
try {
  await bus.emit('payments', data);
}
catch (error) {
  console.error(error);
}
```

## Listener management

```js
bus.listeners.has('users');
bus.listeners.remove('users');
bus.listeners.clear('users');
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
