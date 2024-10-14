const { NodesterQueryError } = require('nodester/errors');


module.exports = function mapCOUNT(
	fnParams,
	rootModel,
	filterIncludes,

	sequelizeQuery
) {
	try {

		const { sequelize } = rootModel;
		const rootModelName = rootModel.options.name;

		const countParams = fnParams.args;
		const [ countTarget ] = countParams;

		// COUNT can be requested for this model,
		// or for any of the available includes.
		const associations = rootModel.associations;

		const isForAssociation = typeof associations[countTarget] !== 'undefined';
		const isForRootModel = countTarget === '';

		// If request to count one of the includes:
		if (isForAssociation) {
			// Check if it's available:
			if (!filterIncludes[countTarget]) {
				const err = new NodesterQueryError(`Count for '${ countTarget }' is not available.`);
				Error.captureStackTrace(err, mapCOUNT);
				throw err;
			}

			// Unwrap desired association info:
			const {
				as,
				target,
				foreignKey,
				sourceKey
			} = associations[countTarget];
			const { tableName } = target;

			// Compile request:
			//	Example of desired SQL:
			//	`(SELECT COUNT(*) FROM comments WHERE comments.post_id=Post.id)`
			const rawSQL = `(SELECT COUNT(*) FROM ${ tableName } where ${ tableName }.${ foreignKey }=${ rootModelName.singular }.${ sourceKey })`;
			
			const countAttributeName = `${ as }_count`;
			sequelizeQuery.attributes.push(
				[sequelize.literal(rawSQL), countAttributeName]
			);
		}

		// If request to COUNT root model:
		else if (isForRootModel) {
			const firstAttribute = Object.keys(rootModel.tableAttributes)[0];

			const countAttributeName = `${ rootModelName.plural.toLowerCase() }_count`;
			sequelizeQuery.attributes.push(
				[sequelize.fn('COUNT', firstAttribute), countAttributeName]
			);
		}

		// Unknown attribute:
		else {
			const err = new NodesterQueryError(`Count for '${ countTarget }' is not available.`);
			Error.captureStackTrace(err, mapCOUNT);
			throw err;
		}
	}
	catch(error) {
		Error.captureStackTrace(error, mapCOUNT);
		throw error;
	}
}
