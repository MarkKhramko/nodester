const defineModel = require('./define');
// ORM.
const { DataTypes } = require('sequelize');


module.exports = _defineDisabledRefreshToken;

function _defineDisabledRefreshToken(
	database,
	roleIds=[],
	options={}
) {

	const fields = {
		id: {
			type: DataTypes.INTEGER.UNSIGNED,
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			_autoGenerated: true
		},
		
		token: {
			type: DataTypes.STRING,
			required: true,
			allowNull: false,
			unique: true
		}
	};

	roleIds.forEach(roleId => fields[roleId] = {
		type: DataTypes.INTEGER.UNSIGNED,
		allowNull: true
	});

	const disabledRefreshToken = defineModel(database, 'DisabledRefreshToken',
		(DataTypes) => ( fields ),
		{ ...options }
	);

	disabledRefreshToken.createOrFind = function({ 
		token,
		...roleInfo
	}) {
		const where = {
			token
		};

		const defaults = {
			token: token,
			...roleInfo
		};

		const query = {
			where,
			defaults
		};
		return this.findOrCreate(query);
	}

	disabledRefreshToken.selectAll = function({ token }) {
		const where = { token };
		const query = { where };
		return this.findAll(query);
	}

	return disabledRefreshToken;
}
