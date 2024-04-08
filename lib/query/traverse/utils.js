/**
 * nodester
 * MIT Licensed
 */
 
'use strict';


module.exports = {
	disassembleQueryNode: _disassembleQueryNode,
	addAssociationQuery: _addAssociationQuery,
}

function _disassembleQueryNode(queryNode) {
	// Disassemble current query node:
	const {
		attributes,
		functions,
		where,
		includes,
		...clauses
	} = queryNode;

	return {
		attributes: attributes ?? [],
		clauses: clauses ?? [],
		functions: functions ?? [],
		where: where ?? {},
		includes: includes ?? [],
	};
}

function _addAssociationQuery(associationQuery, includeName, resultQuery) {

	// Add all association info into query.
	resultQuery.include.push({
		association: includeName,
		...associationQuery
	});
}
