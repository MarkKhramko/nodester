const ResponseFormats = require('nodester/constants/ResponseFormats');


module.exports = class APIResponseFactory {
	constructor() {}

	/*
		Format for all API responses will be JSON
		{
			content: {...}
			error: {...}
		}
		Status code is sent in header.

		If error is not present, error should be null.
		If error is present, content can be null (But it's not required).
	*/
	createGenericResponse(
		options = {
			res: null,
			status: 200,
			content: {},
			error: null,
			format: ResponseFormats.JSON
		}
	) {
		try {
			const data = {
				content: options?.content ?? null,
				error: options?.error ?? null
			};

			switch(options?.format) {
				case ResponseFormats.JSON:
					return options?.res.status(options?.status).json(data);
				case ResponseFormats.XML:
					break;
				default: {
					const err = new Error("No response format specified.");
					throw err;
				}
			}
		}
		catch(error) {
			const err = new Error(`Could not create generic response: ${error.message}`);
			err.name = error?.name;
			err.code = error?.code;

			console.error(err);

			throw err;
		}
	}

	/**
	 * Sends response with status code 200.
	 * Should be called on all successful respones.
	 *
	 * @param <Object> res
	 * @param <Object> content
	 * @param <String> format
	 */
	createOKResponse(options) {

		return this.createGenericResponse({ 
			...options,
			status: 200,
			format: options?.format ?? ResponseFormats.JSON
		});
	}

	/**
	 * Sends response with provided error code.
	 * Should be called on all failed respones.
	 *
	 * @param <Object> res
	 * @param <Object> error
	 * @param <Object> content (optional)
	 * @param <Int>		 status
	 * @param <String> format
	 */
	createErrorResponse(options) {

		return this.createGenericResponse({
			...options,
			status: options?.status ?? 500,
			format: options?.format ?? ResponseFormats.JSON
		});
	}
}
