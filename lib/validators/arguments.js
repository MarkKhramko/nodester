
module.exports = {
	ensure: _ensure
}

/*
 * Validates given argument against rules.
 *
 * @param {Any} argument
 * @param {String} rules
 * @param {String} argumentName
 *
 * @api private
 * @alias ensure
 */
function _ensure(argument, rules, argumentName) {
	const name = argumentName ? `'${ argumentName }'` : 'Argument';
	
	let rulesArray = rules.split(',');

	let types = [];
	let isRequired = undefined;

	for (const rule of rulesArray) {
		// Types:
		if (rule.indexOf('|') > 0) {
			types = [
				...types,
				...rule.split('|')
			];
			continue;
		}

		if (rule === 'required') {
			if (argument === undefined || argument === null) {
				throw new Error(`${ name } is required.`);
			}

			isRequired = true;
			continue;
		}

		types.push(rule);
	}

	if (types.length === 0)
		return true;

	let mismatchedTypesCount = 0;
	for (const type of types) {
		if (typeof argument !== type) {
			mismatchedTypesCount++;
		}
	}

	if (mismatchedTypesCount === types.length && argument !== undefined) {
		throw new TypeError(`${ name } must be of type ${ types.join('|') }.`);
	}

	return true;
}
