<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/MarkKhramko/nodester/refs/heads/main/.github/assets/nodester_logo.png">
    <img alt="nodester logo" src="https://raw.githubusercontent.com/MarkKhramko/nodester/refs/heads/main/.github/assets/nodester_logo.png">
  </picture>
</div>

# nodester [![NPM version](https://img.shields.io/npm/v/nodester)](https://www.npmjs.com/package/nodester) [![License](https://img.shields.io/npm/l/nodester)](https://www.npmjs.com/package/nodester)

> **nodester** is a Node.js framework designed to solve the problem of a complex data querying over HTTP.

The main reason of nodester's existence is the [nodester Query Language (NQL) →](docs/nql/Introduction.md), an extension of standard REST API syntax, it lets you craft complex queries with hierarchical associations.

Building an application which allows users to build their own REST queries raises huge security concerns.
That's why **nodester** was not developped as a middleware. It's a framework equipped with a set of technologies enabling you to fully customize the request-response flow down to the specific user and a database column.
Check out [core concepts documentation →](docs/CoreConcepts.md) for more info.


## Installation

Install with NPM

```shell
npm install -S nodester
```


## Table of Contents

- [Usage](#usage)
- [Documentation](#documentation)
- [Philosophy](#philosophy)
- [License](#license)
- [Copyright](#copyright)


## Usage

```js
const nodester = require('nodester');
const db = require('#db');

const app = new nodester();
app.set.database(db);

// Do any synchronous initializations
// before app.listen here
// ...

// Optional beforeStart hook:
app.beforeStart(async () => {
  // Do any asynchronous initializations
  // before app.listen here
  // ...
});

// Start the http server:
app.listen(8080, function() {
  console.log('listening on port', app.port);
});

// Gracefully shut down:
process.once('SIGTERM', () => {
  app.stop(() => {
    const pid = process.pid;
    console.info('Process', pid, 'terminated\n');
    process.exit(0);
  });
});

```


## Documentation


### Core concepts
[Core concepts documentation →](docs/CoreConcepts.md)


### Queries & querying - nodester Query Language (NQL)
The true strength of nodester lies in its query language. Serving as an extension of standard REST API syntax, it brings many aspects of SQL into REST requests, providing developers with a simple yet powerful tool for expressive and efficient data querying.

Read more about it in the documentation:
[NQL documentaion →](docs/nql/Introduction.md)


### Database
Nodester is built upon a powerful [Sequelize](https://sequelize.org/).<br/>
Supported drivers:
- MySQL
- PostgreSQL

[How to setup a database →](docs/Application.md#with-database)


### Application
[Application documentation →](docs/Application.md)


### Comments

We (contributors) use [JSDoc](https://jsdoc.app/) to describe the actual code.


## Philosophy

The Philosophy of `nodester` is to provide a developer with a tool that can build an app (or feature) in hours and scale it with ease for years.

### Goal

The goal of `nodester` is to be a robust and flexible framework that makes development in iteratations easy, while laying the foundation for seamless scalability in the future.


## License
[MIT](LICENSE)

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
