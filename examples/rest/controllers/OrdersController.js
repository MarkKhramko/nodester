
function OrdersController() {

	this.getMany = function(req, res) {
		console.log({ params: req.params });
		res.json({ controller: 'OrdersController', method: 'getMany' });
	}

	this.getOne = function(req, res) {
		const { params } = req;
		res.json({ controller: 'OrdersController', method: 'getOne', params });
	}
}

module.exports = new OrdersController();
