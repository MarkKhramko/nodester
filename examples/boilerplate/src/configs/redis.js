const {
	REDIS_HOST,
	REDIS_PORT,
	REDIS_USERNAME,
	REDIS_PASSWORD,
	REDIS_DB
} = process.env;


module.exports = {
	url: _buildURL()
}

function _buildURL() {
	let url = 'redis://';

	if (!!REDIS_USERNAME) {
		url += `${ REDIS_USERNAME }:${ REDIS_PASSWORD }@`;
	}

	url += `${ REDIS_HOST ?? 'localhost' }:${ REDIS_PORT ?? 6379 }/${ REDIS_DB ?? 0 }`;

	return url;
}
