# nodester
>  A robust and flexible boilerplate framework that makes iterative development easy.

[![NPM version](https://img.shields.io/npm/v/nodester)](https://www.npmjs.com/package/nodester)
[![License](https://img.shields.io/npm/l/nodester)](https://www.npmjs.com/package/nodester)


## Installation

Install with NPM

```shell
npm install -S nodester
```


## Table of Contents

- [Usage](#usage)
- [Documentation](#documentation)
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
[How to setup "db" ➡️](docs/App.md#with-database)


## Documentation


### Core concepts
[Core concepts documentation ➡️](docs/CoreConcepts.md)


### Queries & Querying - Nodester Query Language (NQR)
One of the main power points of nodester is it's query language. It's an extension of a REST API syntaxis for a broader integration with a database SQL. Read more about it in the documentation:

[NQR documentaion ➡️](docs/Queries.md)


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

The goal of `nodester` is to be a robust and flexible framework that makes development in iteratations easy, and further scale possible.


## LICENSE

MIT

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
