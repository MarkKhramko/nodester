/*!
 * /nodester
 * MIT Licensed
 */

'use strict';


module.exports = class CustomError extends Error {
	constructor(message) {
		super(message);

		this.name = this.constructor.name;
		this.status = 500;

		// Remove constructor info from stack.
		Error.captureStackTrace(this, this.constructor);
	}

	replicate(originalError) {
		this.name = originalError?.name ?? this.name;
		this.code = originalError?.code ?? this.code;
		this.status = originalError?.status ?? this.status;

		// Append stack from original error.
		const linesCount = (this.message.match(/\n/g)||[]).length + 1;
		this.stack = this.stack.split('\n')
													 .slice(0, linesCount+1)
													 .join('\n') + '\n' + originalError.stack;
	}
}
