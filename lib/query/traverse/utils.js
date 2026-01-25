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
	const association = resultQuery.model?.associations?.[includeName];

	/**
	 * NOTE 1:
	 * Sequelize treats `include.where` as `required = true` (INNER JOIN).
	 * This is dangerous for optional relations and self-referential joins.
	 *
	 * Framework rule:
	 * - BelongsTo / HasOne  → INNER JOIN by default
	 * - HasMany / BelongsToMany → LEFT JOIN by default
	 */
	if (
		associationQuery.where &&
		typeof associationQuery.required === 'undefined'
	) {
		associationQuery.required =
			association?.associationType === 'BelongsTo' ||
			association?.associationType === 'HasOne';
	}

	/**
	 * NOTE 2:
	 * Self-referential and BelongsToMany associations can cause
	 * parent row duplication during JOINs.
	 *
	 * `duplicating: false` stabilizes result sets.
	 */
	if (
		association?.associationType === 'BelongsToMany' &&
		typeof associationQuery.duplicating === 'undefined'
	) {
		associationQuery.duplicating = false;
	}

	/**
	 * NOTE 3:
	 * `attributes: []` on includes breaks hydration in Sequelize
	 * and can produce `[{}]` instead of `[]`.
	 * Remove empty attribute lists defensively.
	 */
	if (
		Array.isArray(associationQuery.attributes) &&
		associationQuery.attributes.length === 0
	) {
		delete associationQuery.attributes;
	}

	// Add all association info into query.
	resultQuery.include.push({
		association: includeName,
		...associationQuery,
	});
}
