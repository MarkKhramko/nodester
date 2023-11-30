# nodester

[![NPM version](https://img.shields.io/npm/v/nodester)](https://www.npmjs.com/package/nodester)
[![License](https://img.shields.io/npm/l/nodester)](https://www.npmjs.com/package/nodester)

> **nodester** is a modern and versatile Node.js framework designed to streamline the development of robust and scalable web applications.

**nodester Query Language (NQL):** The main reason of nodester's existence is the [nodester Query Language (NQL)]((docs/Queries.md), an extension of standard REST API syntax, it lets you craft complex queries with hierarchical associations.


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

app.listen(8080, function() {
  console.log('listening on port', app.port);
});
```
[How to setup "db" ➡️](docs/App.md#with-database)


## Documentation


### Core concepts
[Core concepts documentation ➡️](docs/CoreConcepts.md)


### Queries & Querying - Nodester Query Language (NQL)
The true strength of nodester lies in its innovative query language. Serving as an extension of standard REST API syntax, this language offers a comprehensive and seamless integration with SQL databases, providing developers with a powerful tool for expressive and efficient data manipulation.

Read more about it in the documentation:
[NQL documentaion ➡️](docs/Queries.md)


### Database
Nodester is built upon a powerful [Sequelize](https://sequelize.org/).
Supported drivers:
- MySQL
- PostgreSQL


### Application
[Application documentation ➡️](docs/App.md)


## Philosophy

The Philosophy of `nodester` is to provide a developer with a tool that can build an app (or feature) in hours and scale it with ease for years.

### Goal

The goal of `nodester` is to be a robust and flexible framework that makes development in iteratations easy, while laying the foundation for seamless scalability in the future.


## LICENSE

MIT

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
