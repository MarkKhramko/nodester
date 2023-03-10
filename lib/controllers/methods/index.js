
module.exports = {
	getOne: _getOne,
	getMany: _getMany,
	createOne: _createOne,
	updateOne: _updateOne,
	deleteOne: _deleteOne
}


/*
 * @alias getOne
 * @api public
 */
async function _getOne(req, res) {
	try {

		const result = await this.facade.getOne();

		if (this.afterGetOne) {
			await this.afterGetOne(req, res, result);
		}

		return this.respondOk(res, {
			content: { ...result }
		});
	}
	catch(error) {
		console.error('getOne', error);
		if (this.processError) {
			return this.processError(error, req, res);
		}
		else {
			res.status(500);
			res.json({ error: error.toString() });
		}
	}
	finally {
		return Promise.resolve();
	}
}


/*
 * @alias getMany
 * @api public
 */
async function _getMany(req, res) {
	try {
		const result = await this.facade.getMany();

		if (this.afterGetMany) {
			await this.afterGetMany(req, res, result);
		}

		return this.respondOk(res, {
			content: { ...result }
		});
	}
	catch(error) {
		if (this.processError) {
			return this.processError(error, req, res);
		}
		else {
			res.status(500);
			res.json({ error: error.toString() });
		}
	}
	finally {
		return Promise.resolve();
	}
}


/*
 * @alias createOne
 * @api public
 */
async function _createOne(req, res) {
	try {

		const result = await this.facade.createOne();

		if (this.afterCreateOne) {
			await this.afterCreateOne(req, res, result);
		}

		return this.respondOk(res, {
			content: { ...result }
		});
	}
	catch(error) {
		if (this.processError) {
			return this.processError(error, req, res);
		}
		else {
			res.status(500);
			res.json({ error: error.toString() });
		}
	}
	finally {
		return Promise.resolve();
	}
}


/*
 * @alias updateOne
 * @api public
 */
async function _updateOne(req, res) {
	try {

		const result = await this.facade.updateOne();

		if (this.afterUpdateOne) {
			await this.afterUpdateOne(req, res, result);
		}

		return this.respondOk(res, {
			content: { ...result }
		});
	}
	catch(error) {
		if (this.processError) {
			return this.processError(error, req, res);
		}
		else {
			res.status(500);
			res.json({ error: error.toString() });
		}
	}
	finally {
		return Promise.resolve();
	}
}


/*
 * @alias deleteOne
 * @api public
 */
async function _deleteOne(req, res) {
	try {

		const result = await this.facade.deleteOne();

		if (this.afterDeleteOn) {
			await this.afterDeleteOne(req, res, result);
		}

		return this.respondOk(res, {
			content: { ...result }
		});
	}
	catch(error) {
		if (this.processError) {
			return this.processError(error, req, res);
		}
		else {
			res.status(500);
			res.json({ error: error.toString() });
		}
	}
	finally {
		return Promise.resolve();
	}
}


