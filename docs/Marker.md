# Marker | nodester

> Marker is a functional condition that returns `true` or `false`, based on the data in a request/response. Any parameter from the request/response can be used.

## Examples

Role in a request:

```js
// Define new Marker, which will check request's role.
app.add.marker('admin_role', (req) => req.role === 'admin');

// Use the Marker:
app.only('admin_role').route('get /secrets', <handler/>);
app.only('admin_role').use(<handler/>);
```

### Restrict access to the whole [Router](Router.md)

In the next example any route of the `router` will be checked only when application's host domain is `api.awesomeapp.com`.

```js
const Router = require('nodester/router');
const router = new Router();
router.add.route('get /status', <some_handler/>);

// Define new Marker which will check request's header 'host'.
app.add.marker('API', req => req.get('host') === 'api.awesomeapp.com');
// Use the Marker.
app.only('API').use(router())
```

This setup will ensure, that `GET` requests to `/status` are only processed when the `header` `host` value is `api.awesomeapp.com`.

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
