const { NodesterQueryError } = require('nodester/errors');

module.exports = function mapAggregate(
    fnParams,
    rootModel,
    filterIncludes,

    sequelizeQuery
) {
    try {
        const { sequelize } = rootModel;
        const rootModelName = rootModel.options.name;

        const { fn: fnName, args } = fnParams;
        const [target] = args;

        if (!target) {
            const err = new NodesterQueryError(`Function '${fnName}' requires an attribute.`);
            Error.captureStackTrace(err, mapAggregate);
            throw err;
        }

        const associations = rootModel.associations;
        let associationName = null;
        let attributeName = target;

        if (target.includes('.')) {
            [associationName, attributeName] = target.split('.');
        } else if (associations[target]) {
            // If target IS an association name, it might be a mistake for sum/avg/min/max
            // but we can try to be helpful or error out.
            // However, count(comments) is valid.
            const err = new NodesterQueryError(`Function '${fnName}' requires an attribute of '${target}'. Use '${target}.attribute'`);
            Error.captureStackTrace(err, mapAggregate);
            throw err;
        }

        if (associationName) {
            const association = associations[associationName];
            if (!association) {
                const err = new NodesterQueryError(`No include named '${associationName}'`);
                Error.captureStackTrace(err, mapAggregate);
                throw err;
            }

            // Check if it's available in filter:
            if (!filterIncludes[associationName]) {
                const err = new NodesterQueryError(`Aggregate for '${associationName}' is not available.`);
                Error.captureStackTrace(err, mapAggregate);
                throw err;
            }

            const {
                as,
                target: targetModel,
                foreignKey,
                sourceKey
            } = association;
            const { tableName } = targetModel;

            // Compile request:
            const rawSQL = `(SELECT ${fnName.toUpperCase()}(${attributeName}) FROM ${tableName} WHERE ${tableName}.${foreignKey}=${rootModelName.singular}.${sourceKey})`;

            const resultAttributeName = `${as}_${fnName}_${attributeName}`;
            sequelizeQuery.attributes.push(
                [sequelize.literal(rawSQL), resultAttributeName]
            );
        } else {
            // Root model attribute:
            if (typeof rootModel.tableAttributes[attributeName] === 'undefined') {
                const err = new NodesterQueryError(`Attribute '${attributeName}' is not present in model.`);
                Error.captureStackTrace(err, mapAggregate);
                throw err;
            }

            const resultAttributeName = `${rootModelName.plural.toLowerCase()}_${fnName}_${attributeName}`;
            sequelizeQuery.attributes.push(
                [sequelize.fn(fnName.toUpperCase(), sequelize.col(attributeName)), resultAttributeName]
            );
        }
    } catch (error) {
        Error.captureStackTrace(error, mapAggregate);
        throw error;
    }
}
