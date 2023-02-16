const Nodester = require('nodester');

// Init.
const app = new Nodester();

// app.setDatabase();
// app.set('database');

// app.add('marker', 'GET_M', (req)=>req.method === 'GET');

app.add.middleware((req, res, next)=>{
	console.log('1st');

	res.setHeader("Content-type", "text/html");
	res.write("Hello!<br/>...my friend");
	res.end();
})

app.beforeStart(()=>{
	console.log('Before start passed!');
});

app.listen(8080, function() {
	console.log('listening on port', app.port);
});
