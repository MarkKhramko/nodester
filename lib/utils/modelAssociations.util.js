
module.exports = {
	modelHasAssociations: _modelHasAssociations,
	getModelAssociationProps: _getModelAssociationProps,
	compileModelAssociationData: _compileModelAssociationData,
};

function _modelHasAssociations(modelDifinition) {
	return Object.keys(modelDifinition.associations)?.length > 0;
}

function _getModelAssociationProps(
	associationDefinition,
	requestData
) {
	// Extract neccessary variables and functions:
	const associatedModel = associationDefinition.target;
	const { foreignKey } = associationDefinition.options;
	const {
		associationType,
		accessors,
	} = associationDefinition;

	return {
		associatedModel,
		foreignKey,
		associationType,
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
