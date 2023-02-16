const nodester = require('nodester');
const db = require('#db');

// Init.
const app = new nodester();


app.set.database(db);

app.extend('static')

app.static(<path/>);

// Markers.
app.add.marker('admin', (req)=>req.token.role === 'admin');

// Using Markers.
app.only('admin')
	 .route('get /payments', (req, res, next) => {});

app.listen(8080, function() {
	console.log('listening on port', app.port);
});
