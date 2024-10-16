# Router | nodester


## Usage

```js
const Router = require('nodester/router');
const router = new Router();

router.add.route('get /status', (req, res) => {});
```

Then `use` it in your application:

```js
const app = new nodester();

app.use(router);
```

## Usage with a Controller

Let's imagine you created a standard [nodester controller](CoreConcepts.md#controller) named `Articles.controller.js` in the `/src/app/controllers` folder. By passing the `controllersPath` prop during router initialization, the controller's methods will be parsed for your convinient use:

```js
const Router = require('nodester/router');
const Path = require('path');

const cwd = process.cwd();
const controllersPath = Path.join(cwd, 'src', 'app', 'controllers');

const router = new Router({ controllersPath });

router.add.route(
  'get /articles',
  {
    controlledBy: 'Articles.getMany'
  }
);
```

### With a filter:

```js
const ArticlesFilter = require('#filters/Articles');

router.add.route(
  'get /articles',
  {
    before: ArticlesFilter.getMany,
    controlledBy: 'Articles.getMany'
  }
);
```


Then `use` it in your application:

```js
const app = new nodester();

app.use(router);
```

## Usage with a Provider

Let's imagine you created a provider named `Auth.provider.js` in the `/src/app/providers` folder. By passing the `providersPath` prop during router initialization, the provider's methods will be parsed for your convinient use:

```js
const Router = require('nodester/router');
const Path = require('path');

const cwd = process.cwd();
const providersPath = Path.join(cwd, 'src', 'app', 'providers');

const router = new Router({ providersPath });

router.add.route(
  'post /sessions',
  {
    providedBy: 'Auth.createSession'
  }
);
```


## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
