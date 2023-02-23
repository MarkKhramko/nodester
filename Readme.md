# nodester
>  A robust and flexible boilerplate framework that makes iterative development easy.

## Table of Contents

- [Usage](#usage)
- [Markers](#markers)
- [Router](#router)
- [Extending App](#extending-application-functionality)
- [Philosophy](#philosophy)
- [License](#license)
- [Copyright](#copyright)

## Usage

```js
const nodester = require('nodester');
const db = require('#db');

const app = new nodester();
app.set.database(db);

app.listen(8080, function() {
	console.log('listening on port', app.port);
});
```

## Markers

Marker is a functional condition that returns `true | false`, based on data in request/response.

Markers are more powerful indicators than simple route definitions as any parameter in request/response can be used.

For example: our application has 2 domains:
`admin.awesomeapp.com`
`api.awesomeapp.com`

You add markers and handlers specifically for those domains:

```js
app.add.marker('ADMIN', (req) => req.hostname === 'admin.awesomeapp.com');
app.add.marker('API', (req) => req.hostname === 'api.awesomeapp.com');
```

And then use them:

```js
app.only('ADMIN').route('get /payments', <handler>);
app.only('API').route('get /payments', <handler>);
// Or:
app.only('ADMIN').use(<handler>);
app.only('API').use(<handler>);
```

The same can be done for any parameter in request/response:

```js
app.add.marker('admin_role', (req) => req.role === 'admin');
app.only('admin_role').route('get /secrets', <handler>);
app.only('admin_role').use(<handler>);
```

## Router

Router is a built-in middleware.

```js
const Router = require('nodester/router');

const controllersPath = <path_to_controllers_directory>;
const router = new Router({ controllersPath });

router.add.route('get /books', function(req, res) { ... } );
// Or:
router.add.route('get /books', { controlledBy: 'BooksController.getMany' } );
router.add.route('get /books/:id', { controlledBy: 'BooksController.getOne' } );
```

### Using Router:

```js
const nodester = require('nodester');
const router = require(<path_to_router_definition>);

const app = new nodester();
app.use(router());
```


## Extending Application functionality


### Extending instance (safe way):

```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = new nodester();
app.extend('static', serveStatic);
app.static(<path_to_static_directory>);
```

Short:
```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = new nodester();
app.extend('static', serveStatic)(<path_to_static_directory>);
```

Of course you might just do this:
```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = new nodester();
app.static = serveStatic;
````
But you'll never know if you did override any of the app's properties or did not.


### Extending class:

If you really want to override properties or use `nodester` as a boilerplate, you should extend default Application class:

```js
const NodesterApp = require('nodester');

class MyApp extends NodesterApp {
	constructor(opts) {
		super(opts)
	}

	// Override everything you want here...
}

// Don't forget to expose.
module.exports = MyApp;
```

## Philosophy

The Philosophy of `nodester` is to provide a developer with a tool that can build an app (or feature) in hours and scale it with ease for years.

### Goal

The goal of `nodester` is to be a robust and flexible framework that makes iterative development easy.


## LICENSE

MIT

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
