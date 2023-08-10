# Routing | nodester

1) Extend default `nodester` router
```js
const Router = require('nodester/router');

class apiRouter extends Router {
	constructor() {
		super(opts);
		this.add.controllers(<path_to_your_controllers>);
		this.add.controllers(<path_to_your_controllers>, { namespace: 'view' });

		this.add.routes()
	}
}
```

Root namespace is named `__root`

2) Define routes
```js
module.exports = {
	'GET /posts': { controlledBy: 'PostsController.getMany' },

	// For different namespace:
	'GET /view/posts': { controlledBy: '@view PostsViewController.getMany' },
	// Can also be written as:
	'GET /view/posts': {
		namespace: 'view',
		controller: 'PostsViewController'
		action: 'getMany'
	},
}
```

## Copyright
Copyright 2021-present [Mark Khramko](https://github.com/MarkKhramko)
