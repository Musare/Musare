module.exports = {
	title: { type: String, required: true },
	description: { type: String, required: true },
	bugs: [{ type: String }],
	features: [{ type: String }],
	improvements: [{ type: String }],
	upcoming: [{ type: String }],
	createdBy: { type: String, required: true },
	createdAt: { type: Number, default: Date.now(), required: true }
};
