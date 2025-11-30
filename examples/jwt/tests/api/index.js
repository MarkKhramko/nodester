require(process.cwd() + '/alias.config');
require('#configs/environments');

const { HOST } = require('#configs/app');
const axios = require('axios');

const {
	ApiTestError,
	WrongApiResponseContent
} = require('./errors');


void async function testAPI() {

	const loginRequestOptions = {
		url: URL('/auth/token'),
		method: 'POST',
		data: {
			email: 'user@example.com',
			password: 'ppXjDFb$FWjz'
		}
	}

	let refresh_token;

	await request(loginRequestOptions)
	.then(([res, testPassed]) => {
		// 1) Body must exist:
		if (!res.data?.content) {
			throw new ApiTestError("API returned a corrupted response", res);
		}

		const { content } = res.data;

		// 2) Validate fields inside content:
		if (typeof content.access_token !== "string") {
			throw new WrongApiResponseContent("access_token is missing or invalid", res);
		}

		if (typeof content.refresh_token !== "string") {
			throw new WrongApiResponseContent("refresh_token is missing or invalid", res);
		}

		if (typeof content.expires_in !== "number") {
			throw new WrongApiResponseContent("expires_in is missing or invalid", res);
		}

		testPassed();

		refresh_token = content.refresh_token;
	})

	await request({
		url: URL('/auth/refresh'),
		method: 'POST',
		data: {
			refresh_token
		}
	})
	.then(([res, testPassed]) => {
		// 1) Body must exist:
		if (!res.data?.content) {
			throw new ApiTestError("API returned a corrupted response", res);
		}

		const { content } = res.data;

		// 2) Validate fields inside content:
		if (typeof content.access_token !== "string") {
			throw new WrongApiResponseContent("access_token is missing or invalid", res);
		}

		if (typeof content.refresh_token !== "string") {
			throw new WrongApiResponseContent("refresh_token is missing or invalid", res);
		}

		if (typeof content.expires_in !== "number") {
			throw new WrongApiResponseContent("expires_in is missing or invalid", res);
		}

		testPassed();

		refresh_token = content.refresh_token;
	});

	await request({
		url: URL('/auth/revoke'),
		method: 'POST',
		data: {
			refresh_token
		}
	})
	.then(([res, testPassed]) => {

		// 1) Body must exist:
		if (!res.data?.content) {
			throw new ApiTestError("API returned a corrupted response", res);
		}


		const { content } = res.data;

		// 2) Validate fields inside content:
		if (typeof content.revoked !== "boolean" || !content?.revoked) {
			throw new WrongApiResponseContent("revoked key is missing or invalid", res);
		}

		testPassed();
	});

	// Get another token for logout test:
	await request(loginRequestOptions)
	.then(([res]) => {
		const { content } = res.data;
		refresh_token = content.refresh_token;
	})

	await request({
		url: URL('/auth/logout'),
		method: 'POST',
		data: {
			refresh_token
		}
	})
	.then(([res, testPassed]) => {
		// 1) Body must exist:
		if (!res.data?.content) {
			throw new ApiTestError("API returned a corrupted response", res);
		}

		const { content } = res.data;
		
		// 2) Validate fields inside content:
		if (typeof content.logged_out !== "boolean" || !content?.logged_out) {
			throw new WrongApiResponseContent("logged_out key is missing or invalid", res);
		}

		testPassed();
	});

	console.info('✅ All API tests passed!');
}()


async function request(options) {
	console.info('• Testing', options.method, options.url, '...');

	let res;
	try {
		res = await axios.request(options);
	} catch (error) {
		// axios throws for non-2xx, so wrap it into ApiTestError
		const err = new ApiTestError("API request failed", error.response);
		Promise.reject(err);
	}

	const pass = () => {
		console.info('✅', options.method, options.url, 'passed!\n');
	}

	return Promise.resolve([res, pass]);
}


function URL(path) {
	return `${HOST}/api/v1${path}`;
}