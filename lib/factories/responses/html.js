/**
 * nodester
 * MIT Licensed
 */
 
'use strict';

/**
 * WARNING: Unfinihsed. Do not use!
 *
 */


const Params = require('nodester/params');


module.exports = HtmlResponseFactory


class HtmlResponseFactory {
	constructor() {}

	/**
	 * Sends rendererd HTML view with status code 200.
	 * Should be called on all successful respones.
	 *
	 * @param {Object} res
	 * @param {string} viewName
	 * @param {Object} params
	 */
	createOKResponse(params) {
		const {
			res,
			viewName,
			viewParams,
		} = Params(params, {
			res: null,
			viewName: null,
			viewParams: {},
		});

		return res.render(viewName, viewParams);
	}

	/**
	 * Sends response with provided error code.
	 * Should be called on all failed respones.
	 *
	 * @param {Object} res
	 * @param {Object} error
	 * @param {Int}		 code
	 */
	createErrorResponse(params) {
		const {
			res,
			error,
			code,
		} = Params(params, {
			res: null,
			error: {},
			code: 500,
		});

		const statusCode = error?.status ?? code;
		const viewParams = {
			title: `${statusCode} error`,
			heading: `${statusCode} | ${error.message}.`
		};
		return res.render('error', viewParams);
	}
}
