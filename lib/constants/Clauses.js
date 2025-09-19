/**
 * nodester
 * MIT Licensed
 */

'use strict';

const Enum = require('nodester/enum');

const LIMIT = 'limit';
const SKIP = 'skip';
const ORDER = 'order';
const ORDER_BY = 'order_by';

module.exports = new Enum({
	LIMIT,
	SKIP,
	ORDER,
	ORDER_BY,
});
