# Application | nodester

## Barebones examples

```js
const nodester = require('nodester');

const app = new nodester();

app.listen(8080, function() {
  console.log('listening on port', app.port);
});
```

## With a database

```js
const nodester = require('nodester');

const { buildConnection } = require('nodester/database/connection');
// Standard sequilize configuration:
// https://sequelize.org/docs/v6/getting-started/#connecting-to-a-database
const db = buildConnection({
  host: ...,
  port: ...,
  name: ...,

  username: ...,
  password: ...,

  dialect: ...,
  pool: ...,
  charset: ...,
  collate: ...,

  timestamps: ...,

  logging: ...,
});

const app = new nodester();
app.set.database(db);

app.listen(8080, function() {
  console.log('listening on port', app.port);
});
```


## Extending Application functionality


### Extending Instance (safe way):

```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = new nodester();
app.extend('static', serveStatic);
app.static(<path_to_static_directory/>);
```

Short:
```js
const serveStatic = require('serve-static');

const nodester = require('nodester');

const app = new nodester();
app.extend('static', serveStatic)(<path_to_static_directory/>);
```


### Extending Class:

If you really want to override properties or use `nodester` as a boilerplate, you should extend the default application class:

```js
const NodesterApp = require('nodester');

class MyApp extends NodesterApp {
  constructor(opts) {
    super(opts)
  }

  // Override everything you want here...
}

// Don't forget to export.
module.exports = MyApp;
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
