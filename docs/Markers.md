# Markers | nodester

> Markers are functional condition that returns `true | false`, based on data in request/response. Any parameter in request/response can be used.

## Examples

Role in request:

```js
app.add.marker('admin_role', (req) => req.role === 'admin');
app.only('admin_role').route('get /secrets', <handler/>);
app.only('admin_role').use(<handler/>);
```

### Specific [Router](docs/Routing.md)

In the next example any route of the `router` will be checked only when applicatin's host domain is `api.awesomeapp.com`.

```js
const Router = require('nodester/router');
const router = new Router();
router.add.route('get /status', <some_handler>);

app.add.marker('API', req => req.get('host') === 'api.awesomeapp.com');
app.only('API').use(router())
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
