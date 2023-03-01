const util = require('util');

/*
 * NodesterQueryParams is a ready-to-use replacement for URLSearchParams.
 * The only difference is that NodesterQueryParams
 * respects nested "&" during parsing.
 */
module.exports = class NodesterQueryParams {
	constructor(queryString='') {

		// You never know if it's encoded or not.
		const decoded = decodeURI(queryString);

		const stateHistory = [{}];
		const lastEntry = () => stateHistory[stateHistory.length - 1];

		const paramLevels = {};

		let currentParam = '';
		let currentToken = '';

		this._map = new Map();

		for (let i=0; i < decoded.length; i++) {
			const char = decoded[i];

			if (char === '(') {
				// Error If there is nothing behind:
				if (currentParam.length === 0) {
					const err = new TypeError('Invalid query string');
					throw err;
				}

				// If not special token, go deeper:
				if (['and', 'or', 'xor', 'not', '!', '|', 'like'].indexOf(currentToken) === -1) {
					this.append(currentParam, currentToken);
					stateHistory.push({ param: currentParam, deeper: true });

					// currentParam = '';
					// currentToken = '';
				}

				// will set ( in token later.
			}

			if (char === ')') {
				// If sub-level:
				if (lastEntry().deeper) {
					stateHistory.pop();
				}

				// If top-level:
				if (!lastEntry().deeper) {
					console.log(currentToken);
				}
			}

			// & can mean the end of key=value pair:
			if (char === '&') {
				// If top-level:
				if (!lastEntry().deeper) {
					this.append(currentParam, currentToken);
					currentParam = '';
					currentToken = '';
					continue;
				}

				// If sub-level do nothing.
			}
			
			// = can mean the end of param name:
			if (char === '=') {
				// If top-level:
				if (!lastEntry().deeper) {
					currentParam = currentToken;
					currentToken = '';
				}
			}
			
			// Continue building token:
			if (char !== '=' || lastEntry().deeper ) {
				currentToken += char;
			}

			// If last char:
			if (i === decoded.length-1) {
				this.append(currentParam, currentToken);
			}
		}
	}

	append(...args) {
		this._map.set(...args);
	}

	get(...args) {
		this._map.get(...args);
	}

	delete(...args) {
		this._map.delete(...args);
	}

	entries(...args) {
		return this._map.entries(...args);
	}

	[util.inspect.custom](depth, opts) {
		return this._map;
	}
}
