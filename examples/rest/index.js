'use strict'

const nodester = require('nodester');
const router = require('./router');

// Init.
const app = new nodester();

// app.setDatabase();
// app.set('database');

app.use(router());

app.add.marker('GET_M', (req)=>req.method === 'GET');

app.only('GET_M').use(async (req, res) => {
	res.json({ msg: 'GET method response' });
});

app.use((req, res)=>res.json({ msg: 'last' }));

// app.only('GET_M').route('get /orders', async (req, res) => {
// 	res.json({ route: 'orders' });
// });

// app.add.middleware((req, res, next)=>{
// 	console.log('1st', 'hello!');
// 	next();
// });

// app.add.middleware((req, res, next)=>{
// 	console.log('Last!');

// 	res.setHeader("Content-type", "text/html");
// 	res.write("Hello!<br/>...my friend");
// 	res.end();
// });

app.beforeStart(()=>{
	console.log('Before start passed!');
});

app.listen(8080, function() {
	console.log('listening on port', app.port);
});
