# nodester
>  A robust boilerplate framework that makes iterative development easy.

## Table of Contents

- [Usage](#usage)
- [Extending](#extending-application-functionality)
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

Marker is a functional condition that returns `true | false`, based on data in request.


### Adding a Marker

```js
app.add.marker('admin', (req) => req.role === 'admin');
```


### Using a Marker

```js
app.only('admin').route('get /payments', <handler>);
app.only('/api').route('get /payments', <handler>);
```


## Router

```js
app.route('get /books', function(req, res) { ... } );
app.route('get /books', { controlledBy: 'BooksController.getMany' } );
app.route('get /books/:id', { controlledBy: 'BooksController.getOne' } );
```


## Extending Application functionality


### Extending instance (safe way):

```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = nodester();
app.extend('static', serveStatic);
app.static(<path_to_static_directory>);
```

Short:
```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = nodester();
app.extend('static', serveStatic)(<path_to_static_directory>);
```

Of course you might just do this:
```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = nodester();
app.static = serveStatic;
````
But you'll never know if you did override any of the app's properties or did not.


### Extending class:

If you really want to override properties or use `nodester` as a boilerplate, you should better extend default Application class:

```js
const DefaultApplication = require('nodester');

class MyApp extends DefaultApplication {
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

The goal of `nodester` is to be a robust boilerplate that makes iterative development easy.


## LICENSE

MIT

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
