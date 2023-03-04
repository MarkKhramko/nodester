// Dictionary of unsafe characters:
const NOT_ALLOWED = [
	'{',
	'}',
	// `\`,
	'^',
	'~',
	'[',
	']',
	'`'
];

const util = require('util');

/*
 * NodesterQueryParams is a ready-to-use replacement for URLSearchParams.
 * The only difference is that NodesterQueryParams
 * respects nested "&" during parsing.
 */
module.exports = class NodesterQueryParams {
	constructor(queryString='') {
		// Type validateion:
		if (typeof queryString !== 'string') {
			const err = new TypeError(`'query' must be a String.`);
			throw err;
		}

		// You never know if it's encoded or not.
		const decoded = decodeURI(queryString);

		// Indicates, how deep the char is inside different ().
		let deep = 0;

		const paramLevels = {};

		// Current query parameter.
		let param = '';

		// Current query token.
		let token = '';

		this._map = new Map();

		for (let i=0; i < decoded.length; i++) {
			const char = decoded[i];

			// Validate char:
			if (NOT_ALLOWED.indexOf(char) > -1) {
				const err = new TypeError(`Invalid query token at ${ i }: '${ char }'`);
				throw err;
			}

			if (char === '(') {
				// Error If there is nothing behind:
				if (param.length === 0) {
					const err = new TypeError(`Invalid query token at ${ i }: '${ char }'`);
					throw err;
				}

				// If not special token, go deeper:
				if (['and', 'or', 'xor', 'not', '!', '|', 'like'].indexOf(token) === -1) {
					this.append(param, token);
					deep++;
				}

				// will set ( in token later.
			}

			if (char === ')') {
				// If sub-level:
				if (deep > 0) {
					deep--
				}
			}

			// & can mean the end of key=value pair:
			if (char === '&') {
				// If top-level:
				if (deep === 0) {
					this.append(param, token);
					param = '';
					token = '';
					continue;
				}

				// If sub-level do nothing.
			}
			
			// = can mean the end of param name:
			if (char === '=') {
				// If top-level:
				if (deep === 0) {
					param = token;
					token = '';
				}
			}
			
			// Continue building token:
			if (char !== '=' || deep > 0 ) {
				token += char;
			}

			// If last char:
			if (i === decoded.length-1) {
				// Validate:
				if (deep > 0) {
					const err = new TypeError(`Missing ')' at ${ i }`);
					throw err;
				}

				this.append(param, token);
			}
		}
	}

	append(...args) {
		return this._map.set(...args);
	}

	get(...args) {
		return this._map.get(...args);
	}

	delete(...args) {
		return this._map.delete(...args);
	}

	entries(...args) {
		return this._map.entries(...args);
	}

	toString() {
		return this._map.toString();
	}

	[util.inspect.custom](depth, opts) {
		return this._map;
	}
}
