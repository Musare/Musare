module.exports = {
	_id: { type: String, unique: true, required: true },
	title: { type: String, required: true },
	artists: [{ type: String }],
	genres: [{ type: String }],
	duration: { type: Number, required: true },
	skipDuration: { type: Number, required: true },
	thumbnail: { type: String, required: true },
	explicit: { type: Boolean, required: true },
	requestedBy: { type: String, required: true },
	requestedAt: { type: Date, default: Date.now(), required: true }
};
