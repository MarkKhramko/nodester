/**
 * nodester
 * MIT Licensed
 */

'use strict';

const Enum = require('nodester/enum');

const NODESTER_QUERY_ERROR = 'NodesterQueryError';
const UNAUTHORIZED_ERROR = 'Unauthorized';
const NOT_FOUND_ERROR = 'NotFound';
const VALIDATION_ERROR = 'ValidationError';
const CONFLICT_ERROR = 'ConflictError';
const SEQUELIZE_UNIQUE_CONSTRAINT_ERROR = 'SequelizeUniqueConstraintError';
const INTERNAL_VALIDATION_ERROR = 'InternalValidationError';

module.exports = new Enum({
	NODESTER_QUERY_ERROR,
	UNAUTHORIZED_ERROR,
	NOT_FOUND_ERROR,
	VALIDATION_ERROR,
	CONFLICT_ERROR,
	SEQUELIZE_UNIQUE_CONSTRAINT_ERROR,
	INTERNAL_VALIDATION_ERROR,
});
