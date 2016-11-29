module.exports = {
	title: { type: String, required: true },
	description: { type: String, required: true },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now(), required: true }
};
