const parse = require('./parser');
const NodesterQueryParams = require('../../../queries/NodesterQueryParams');


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

	// Convert to URLSearchParams.
	const queryString = req.url.split('?')[1];
	const queryParams = new NodesterQueryParams(queryString);
	const nquery = await parse(queryParams);

	console.log({ nquery }, nquery.include);

	next();
}
