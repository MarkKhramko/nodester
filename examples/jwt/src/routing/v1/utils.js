
module.exports = {
	v1
}

function v1(route='get /') {
	const parts = route.replace(/ +/g, ' ').split(' ');
	const method = parts[0];
	return `${ method } /api/v1${ parts[1] }`;
}
