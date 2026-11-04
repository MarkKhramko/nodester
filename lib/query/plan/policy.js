'use strict';

/** Resolve request-context policy values without mutating Filter configuration. */
function resolvePolicy(value, context) {
	if (typeof value === 'function') return resolvePolicy(value(context), context);
	if (Array.isArray(value)) return value.map(item => resolvePolicy(item, context));
	if (!value || typeof value !== 'object') return value;

	// Sequelize-compatible values such as Date instances are atomic policy
	// values. Recursively walking a Date turns it into an empty object and
	// breaks date comparisons in context-dependent constraints.
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return value;

	const result = {};
	for (const [key, item] of Object.entries(value)) result[key] = resolvePolicy(item, context);
	for (const symbol of Object.getOwnPropertySymbols(value)) result[symbol] = resolvePolicy(value[symbol], context);
	return result;
}

function resolveConstraint(filter, inherited, context) {
	const configured = filter.constraints ?? {};
	const local = {
		where: resolvePolicy(configured.where ?? {}, context),
		includes: resolvePolicy(configured.includes ?? configured.requiredIncludes ?? {}, context),
	};
	if (!inherited) return local;
	return {
		where: { ...resolvePolicy(inherited.where ?? {}, context), ...local.where },
		includes: { ...resolvePolicy(inherited.includes ?? {}, context), ...local.includes },
	};
}

module.exports = { resolvePolicy, resolveConstraint };
