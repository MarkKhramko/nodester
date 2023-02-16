const express = require('express');
const path = require('path');

const cwd = process.cwd();

// Utils:
const { isString } = require('util');
const {
	isConstructor,
	splitByLastDot
} = require('./utils');


module.exports = function RoutesMapper(
	routes,
	pathToController,
	middlewareGenerals = []
) {
	const router = express.Router();

	let requestMethodPath;
	let requestMethod;
	
	let controllerMethod;
	let controller;
	let contr;

	let handler;

	let myPath;
	const myPathToController = path.join(cwd, pathToController);

	Object.entries(routes).forEach((value) => {
		let middlewares;
		// To let use an array or only one function as general middlewares:
		if (Array.isArray(middlewareGenerals)) {
			middlewares = [ ...middlewareGenerals ];
		}
		else if (typeof middlewareGenerals === 'function') {
			middlewares = [ middlewareGenerals ];
		}
		else {
			middlewares = [];
		}
		requestMethodPath = value[0].replace(/\s\s+/g, ' ');
		requestMethod = requestMethodPath.split(' ')[0].toLocaleLowerCase();
		myPath = requestMethodPath.split(' ')[1];

		if (isString(value[1])) {
			controller = splitByLastDot(value[1])[0];
			controllerMethod = splitByLastDot(value[1])[1];
		}
		else {
			// Contains middlewares and other configuration.
			const props = value[1];

			// Extract controller paths:
			if (props.path !== undefined) {
				controller = splitByLastDot(props.path)[0];
				controllerMethod = splitByLastDot(props.path)[1];
			}

			// Extract middlewares:
			if (
				props.middlewares !== undefined &&
				Array.isArray(props.middlewares)
			) {
				middlewares.push(...props.middlewares);
			}
		}
		middlewares = middlewares.filter(el => el != null);

		try {
			handler = require(`${ myPathToController }${ controller }`);
			const isConstructable = isConstructor(handler);
			const type = typeof handler;

			if (isConstructable) {
				contr = new handler();
			}
			else if (type === 'function') {
				contr = handler();
			}
			else if (type === 'object') {
				contr = handler;
			}
		}
		catch (err) {
			console.error('Routes mapper error:', err);
			
			require('@babel/register');
			handler = require(`${ myPathToController }${ controller }`).default;
			contr = new handler();
		}

		router.route(myPath)[requestMethod](middlewares, contr[controllerMethod].bind(contr));
	});

	return router;
};
