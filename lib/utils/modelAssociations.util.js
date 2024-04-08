
module.exports = {
	modelHasAssociations: _modelHasAssociations,
	getModelAssociationProps: _getModelAssociationProps,
	compileModelAssociationData: _compileModelAssociationData,
};

function _modelHasAssociations(modelDifinition) {
	return Object.keys(modelDifinition.associations)?.length > 0;
}

function _getModelAssociationProps(
	associationDefinition
) {
	// Extract neccessary variables and functions:
	const associatedModel = associationDefinition.target;
	
	const {
		foreignKey,
		sourceKey
	} = associationDefinition;

	const {
		associationType,
		accessors,
	} = associationDefinition;

	return {
		associatedModel,
		associationType,

		foreignKey,
		sourceKey,

		accessors,
	};
}

function _compileModelAssociationData({
	dataOfAssociation,
	parentForeignKey,
	parentModelId,
}) {
	const result = {
		...dataOfAssociation,
		[parentForeignKey]: parentModelId,
		deletedAt: null
	};

	return result;
}
