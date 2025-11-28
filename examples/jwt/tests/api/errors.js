class ApiTestError extends Error {
	constructor(message, res) {
		super(message);

		this.name = "ApiTestError";

		if (res) {
			this.status = res.status;
			this.url = res.config?.url;
			this.method = res.config?.method;
			this.requestBody = res.config?.data;
			this.responseBody = res.data;
		}

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ApiTestError);
		}
	}
}

class WrongApiResponseContent extends Error {
	constructor(message, res) {
		super(message);

		this.name = "WrongApiResponseContent";

		// Basic error info
		this.message = message;

		// Response details (if available)
		if (res) {
			this.status       = res.status ?? null;
			this.url          = res.config?.url ?? null;
			this.method       = res.config?.method ?? null;
			this.requestBody  = res.config?.data ?? null;
			this.responseBody = res.data ?? null;
		}

		// Keep JS stack clean
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, WrongApiResponseContent);
		}
	}

	// For test runners — standard object for logging
	toJSON() {
		return {
			name: this.name,
			message: this.message,
			status: this.status,
			url: this.url,
			method: this.method,
			requestBody: this.requestBody,
			responseBody: this.responseBody
		};
	}
}

module.exports = {
	ApiTestError,
	WrongApiResponseContent
}
