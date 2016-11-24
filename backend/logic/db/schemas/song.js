module.exports = {
	id: { type: String, unique: true, required: true },
	title: { type: String, required: true },
	artists: [{ type: String }],
	duration: { type: String, required: true },
	skipDuration: { type: Number, required: true },
	thumbnail: { type: String, required: true }
};
