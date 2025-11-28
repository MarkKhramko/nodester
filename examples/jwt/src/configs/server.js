const {
	APP_PORT,
	PORT,
} = process.env;


module.exports = {
	PORT: APP_PORT ?? PORT ?? '8080',
};
