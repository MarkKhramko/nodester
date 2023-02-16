const {
	splitByComma,
	splitByDot
} = require('nodester/utils/strings.util');
// Query util.
const {
	hasSubIncludesQuery,
	cutSubIncludesQuery,
	parseSubIncludesQuery
} = require('nodester/utils/queries.util');


module.exports = {
	parseIncludesQuery: _parseIncludesQuery
}

function _parseIncludesQuery(
	modelDefinition,
	includesQueryString
) {
	const associationAndSubs = splitByComma(includesQueryString);
	const allowedAssociations = Object.keys(modelDefinition.associations);

	associationAndSubs.forEach((a) => {
		let association = a.split('.')[0];

		if (hasSubIncludesQuery(association)) {
			const [ nestedQuery, _association ] = cutSubIncludesQuery(association);
			association = _association;
		}

		if (allowedAssociations.indexOf(association) === -1) {
			const err = new Error(`Association with name "${ association }" doesn't exist on this model.`);
			err.name = 'NotFound';
			throw err;
		}
	});

	const result = associationAndSubs.map(associationAndSubsString => _parseSubIncludes(associationAndSubsString));

	return result;
}

function _parseSubIncludes(associationAndSubsString) {
	const associationAndSubs = splitByDot(associationAndSubsString);

	// If association has SubIncludes:
	if (associationAndSubs?.length > 0) {
		const clearAssociation = associationAndSubs[0];
		const subs = associationAndSubs.splice(1, associationAndSubs.length - 1);

		if (subs.length > 0) {
			const result = {
				association: clearAssociation,
				include: [ _parseSubIncludes(subs.join('.')) ]
			};

			_parseSubIncludesQueryIfPresent(result);

			return result;
		}
	}
	
	// By default just return association.
	const result = { association: associationAndSubsString };
	_parseSubIncludesQueryIfPresent(result);
	return result;
}

function _parseSubIncludesQueryIfPresent(resultQuery) {
	if (hasSubIncludesQuery(resultQuery.association)) {
		const [ nestedQuery, clearAssociation ] = cutSubIncludesQuery(resultQuery.association);

		resultQuery.association = clearAssociation;
		parseSubIncludesQuery(clearAssociation, nestedQuery, resultQuery);
	}

	return resultQuery;
}
