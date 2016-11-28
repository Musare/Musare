module.exports = {
	title: { type: String, required: true },
	description: { type: String, required: true },
	fixes: [{ type: String }],
	features: [{ type: String }],
	changes: [{ type: String }],
	upcoming: [{ type: String }],
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now(), required: true }
};
