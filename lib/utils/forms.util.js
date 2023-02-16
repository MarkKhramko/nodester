// Utils.
const formidable = require('formidable');


module.exports = {
	parseRequestForm: _parseRequestForm,
}

function _parseRequestForm(req) {
	return new Promise(function (resolve, reject) {
		const form = new formidable.IncomingForm();

		form.parse(req, function (err, fields, files) {
			if (err) {
					return reject(err);
			}

			const result = { fields, files };
			return resolve(result);
		});
	});
}
