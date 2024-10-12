
class NodesterQueryError extends Error {
	constructor(message) {
		super(message);
		this.name = 'NodesterQueryError';
	}
}

module.exports = NodesterQueryError;
