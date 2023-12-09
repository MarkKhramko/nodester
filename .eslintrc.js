module.exports = {
	parserOptions: {
		ecmaVersion: 2023, // or the latest version supported by ESLint
	},
	plugins: ['jsdoc'],
	rules: {
		'jsdoc/check-alignment': 'warn',
		'jsdoc/check-indentation': 'warn',
		'jsdoc/check-syntax': 'warn',
		'jsdoc/require-param-type': 'warn',
		'jsdoc/valid-types': 'warn',
	},
};
