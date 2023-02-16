const Layer = require('./layer');

// Utils:
const { getType } = require('../../utils/types.util');


module.exports = function NodesterDefaultRouter(app=null) {
	this.markers = {};
	this.layer = new Layer();

	if (!!app) {
		this.app = app
	}

	// Expose methods:
	// 	Markers:
	this.addMarker = _addMarker;
	this.getMarker = _getMarker;

	//	Routing:
	this.handle = _handle;
	this.only = _only;
	this.route = _route;
}

/**
 * Adds marker to the stack.
 * Returns itself for chaining.
 * @return {NodesterDefaultRouter}
 *
 * @alias addMarker
 * @public
 */
function _addMarker(nameOrSymbol='', fn=()=>{}) {
	if (typeof fn !== 'function') {
		const err = new TypeError(`Router.addMarker() requires a middleware function but got a ${ getType(fn) }`);
    throw err;
  }

  const marker = this.getMarker(nameOrSymbol);
  if (marker.marker.index > -1) {
  	const err = new TypeError(`Marker with key ${ nameOrSymbol } is already set.`);
  	throw err;
  }

  this.markers[nameOrSymbol] = fn;

  return this;
}


/**
 * Tries to find marker's data by provided key.
 * @return {Object}
 *
 * @alias getMarker
 * @public
 */
function _getMarker(nameOrSymbol='') {
	const result = {
		marker: {
			key: nameOrSymbol,
			index: -1,
		},
		middleware: undefined		
	}
	try {
		const keys = Object.keys(this.markers);

		const index = keys.indexOf(nameOrSymbol);
		if (keys.indexOf(nameOrSymbol) === -1) {
			const err = new Error('NotFound');
			throw err;
		}

		// Marker found:
		result.marker.index = index;
		result.middleware = this.markers[nameOrSymbol];
	}
	catch(error) {
		result.marker.index = -1;
	}

	return result;
}

/**
 * Start routes pipeline processing.
 *
 * If no callback is provided, then default error handlers will respond
 * in the event of an error bubbling through the stack.
 *
 * @alias handle
 * @public
 */
function _handle(req, res, callback) {
	const method = req.method;
	const requestPath = req.url;

	console.log(method, requestPath);

	let markerName = null;

	// Check if this request satisfies any markers:
	const markers = Object.entries(this.markers);
	console.log({ markers });

	for (const [marker, fn] of markers) {
		const result = fn(req, res, callback);
		console.log(result);

		if (result === true) {
			markerName = marker;
			break;
		}
	}

	console.log({ markerName });

	return res.send(markerName ?? 'Hi!');
}


/**
 *
 * @alias only
 * @public
 */
function _only(condition) {
	this.layer.push('condition', condition);
	// Return layer for chaining.
	return this.layer;
}


/**
 *
 * @alias route
 * @public
 */
function _route() {

}
