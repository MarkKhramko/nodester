const { ensure } = require('nodester/validators/arguments');


module.exports = {
	withFormattedResponse: _withFormattedResponse,

	respondOk: _respondOk,
	respondWithError: _respondWithError,
}

/**
 *
 * @param {Function|Object} target
 *
 */
function _withFormattedResponse(target) {
	ensure(target, 'function|object,required', 'target');

	target.respondOk = _respondOk.bind(target);
	target.respondWithError = _respondWithError.bind(target);
}

function _respondOk(res, data, status=200) {
	const result = {
		content: { ...data },
		error: null
	}
	res.status(status);
	return res.json(result);
}

function _respondWithError(res, error, status=500) {
	let statusCode = error?.status ?? status;
	let message = error?.message;

	// There are named errors,
	// which will change the error status:
	switch(error.name) {
		case 'Unauthorized': {
			statusCode = 401;
			message = 'Unauthorized';
			break;
		}
		case 'NotFound': {
			statusCode = 404;
			break;
		}
		case 'ValidationError': {
			statusCode = 422;
			break;
		}
		case 'ConflictError': {
			statusCode = 409;
			// errorResponse.details = error?.details ?? error?.message;
			break;
		}
		case 'SequelizeUniqueConstraintError': {
			statusCode = 409;
			message = error?.errors;
			break;
		}
		default:
			break;
	}

	const result = {
		content: null,
		error: {
			details: {
				message: message
			},
			code: error.name
		},
		status: statusCode
	}
	res.status(statusCode);
	return res.json(result);
}
