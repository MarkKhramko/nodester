const {
	DB_NAME,
	DB_USER,
	DB_PASSWORD,
	DB_HOST,
	DB_PORT,
	DB_DIALECT,
} = process.env;

const CHARSET = 'utf8mb4';
const COLLATE = 'utf8mb4_general_ci';


module.exports = {
	database: DB_NAME,
	username: DB_USER,
	password: DB_PASSWORD,
	host: DB_HOST || 'localhost',
	port: DB_PORT || '3306',
	dialect: DB_DIALECT || 'mysql',

	pool: {
		max: 5,
		min: 0,
		idle: 10000,
		acquire: 100000,
	},
	charset: CHARSET,
	collate: COLLATE, 
	timestamps: true,
	logging: false,
}
