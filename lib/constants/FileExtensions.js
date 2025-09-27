/**
 * nodester
 * MIT Licensed
 */

'use strict';

// JS:
const jsCodeExtensions = [
	'js', // built-in
	'cjs', // https://nodejs.org/api/esm.html#esm_enabling
	'mjs', // https://nodejs.org/api/esm.html#esm_enabling
	'iced', // http://maxtaco.github.io/coffee-script/
	'liticed', // http://maxtaco.github.io/coffee-script/ (literate iced)
	'iced.md', // http://maxtaco.github.io/coffee-script/ (literate iced)
	'coffee', // http://coffeescript.org/
	'litcoffee', // http://coffeescript.org/ (literate coffee)
	'coffee.md', // http://coffeescript.org/ (literate coffee)
	'ts', // https://www.typescriptlang.org/
	'tsx', // https://www.typescriptlang.org/docs/handbook/jsx.html
	'cs',  // http://bridge.net/ ??
	'ls', // http://livescript.net/
	'es6', // https://babeljs.io
	'es', // https://babeljs.io
	'jsx', // https://babeljs.io https://facebook.github.io/jsx/.
	'sjs', // http://onilabs.com/stratifiedjs
	'co', // http://satyr.github.io/coco/
	'eg' // http://www.earl-grey.io/
];

const jsConfigExtensions = [
	'json', // built-in
	'json.ls', // http://livescript.net/
	'json5' // http://json5.org/
];
// JS\


module.exports = {
	js: {
		code: jsCodeExtensions,
		config: jsConfigExtensions
	}
}
