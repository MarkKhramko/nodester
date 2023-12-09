/**
 * nodester
 * MIT Licensed
 */

'use strict';

// Arguments validator.
const { ensure } = require('nodester/validators/arguments');


module.exports = {
	AST_ModelsTree: _AST_ModelsTree,
	AST_ModelsTreeNode: _AST_ModelsTreeNode
}

/**
 * @alias AST_ModelsTree
 * @acess public
 */
function _AST_ModelsTree(modelsTree) {
	ensure(modelsTree, 'object,required', 'modelsTree');
	return _AST_ModelsTreeNode(modelsTree.root);
}

/**
 * @alias AST_ModelsTreeNode
 * @acess public
 */
function _AST_ModelsTreeNode(node, spacing=0) {
	ensure(node, 'object,required', 'node');
	ensure(spacing, 'number,required', 'spacing');

	let spaces = ' ';
	for (let i = 0; i < spacing; i++) {
		spaces += ' ';
	}

	let ast = `${ spaces }┏ TreeNode\n`;
	ast += `${ spaces }┃\n`;

	ast += `${ spaces }┣ model: ${ node.model }\n`;
	ast += `${ spaces }┃\n`;

	ast += `${ spaces }┣ fields (${ node.fields.length }): [\n${ node.fields.map(f => ` • ${ f },\n`) }`;
	ast += `${ spaces }┃ ]\n`;
	ast += `${ spaces }┃\n`;

	ast += `${ spaces }┣ functions (${ node.functions.length }): [\n${ node.functions.map(f => ` • ${ f },\n`) }`;
	ast += `${ spaces }┃ ]\n`;
	ast += `${ spaces }┃\n`;

	ast += `${ spaces }┣ where: ${ JSON.stringify(node.where) }\n`;
	ast += `${ spaces }┃\n`;

	['skip','limit','order','order_by'].map(c => {
		ast += `${ spaces }┣ ${ c }: ${ node[c] }\n`;
		ast += `${ spaces }┃\n`;
	});
	
	ast += `${ spaces }┗ includes (${ node.includes.length }): [\n`
	node.includes.map(n => ast += _AST_ModelsTreeNode(n, spacing + 2));
	ast += `${ spaces }  ]\n`;

	return ast;
}
