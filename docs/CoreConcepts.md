# Core concepts | nodester

## [Model](#model)-[Facade](#facade)-[Controller](#controller)


## Client
Client is an entity that interacts with your application using REST API.


## Controller
Controller is a gatekeeper to a facade.
It manages or directs the flow of data between the [Client](#client) and a [Facade](#facade).


## Facade
Facade is a wrapper around model.


## Filter
[Filter](./Filter.md) is a set of rules on how to process [Client's](#Client) input.


## Markers

Marker is a functional condition that returns `true | false`, based on data in request/response.

Markers are more powerful indicators than simple route definitions, as any parameter in request/response can be used.

For example: our application has 2 domains:
`admin.awesomeapp.com`
`api.awesomeapp.com`

You add markers and handlers specifically for those domains:

```js
app.add.marker('ADMIN', (req) => req.get('host') === 'admin.awesomeapp.com');
app.add.marker('API', (req) => req.get('host') === 'api.awesomeapp.com');
```

And then use them:

```js
app.only('ADMIN').route('get /payments', <handler/>);
app.only('API').route('get /payments', <handler/>);
// Or:
app.only('ADMIN').use(<handler/>);
app.only('API').use(<handler/>);
```

[More examples ➡️](Markers.md)


## Model
Model is a high-level definition of a database table.



## Router

Router is a built-in middleware.

```js
const Router = require('nodester/router');

const controllersPath = <path_to_controllers_directory/>;
const router = new Router({ controllersPath });

router.add.route('get /books', function(req, res) { ... } );
// Or:
router.add.route('get /books', { controlledBy: 'BooksController.getMany' } );
router.add.route('get /books/:id', { controlledBy: 'BooksController.getOne' } );
```


## Service
Service manages interactions between application and other APIs.
Other APIs include:
- Third-party APIs;
- API of node_modules;
- API of modules inside your application.



### Using Router:

```js
const nodester = require('nodester');
const router = require(<path_to_router_definition/>);

const app = new nodester();
app.use(router());
```


## Util
Util is a self-sufficient code snippet.
You can find all available utils under `nodester/utils`.


## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
