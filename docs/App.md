# nodester Application

## Init

```js
	const nodester = require('nodester');
	
	const app = new nodester();

	app.listen(8080, function() {
		console.log('listening on port', app.port);
	});
```
