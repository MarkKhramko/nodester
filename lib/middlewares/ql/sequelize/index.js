const QueryLexer = require('./interpreter/QueryLexer');


module.exports = NodesterQL;

async function NodesterQL(req, res, next) {
	// Object, which will be populated with parsed query.
	req.nquery = {};

	// Unwrap neccessary params.
	const {
		url
	} = req;

	// If no query, skip:
	if (url.indexOf('?') === -1) {
		return next();
	}

	try {
		// Convert to URLSearchParams.
		const queryString = req.url.split('?')[1];

		console.time('interpretation');
		const lexer = new QueryLexer(queryString);
		console.timeEnd('interpretation');

		// Go on!
		req.nquery = lexer.query;
		next();
	}
	catch(error) {
		res.status(422);
		res.json({ error: error.toString() });
	}
}
