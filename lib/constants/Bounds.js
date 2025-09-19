/**
 * nodester
 * MIT Licensed
 */

'use strict';

const Enum = require('nodester/enum');

const limit = {
	min: 1,
	max: 3,
}

const skip = {
	min: 0
}

module.exports = new Enum({
	limit,
	skip
});
