module.exports = {
	released: { type: Date, default: Date.now(), required: true},
	title: { type: String, required: true },
	content: [{
		head: String,
		body: [{ type: String }]
	}],
	author: { type: String, default: 'Musare Team', required: true }
};
