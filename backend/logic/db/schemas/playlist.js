module.exports = {
	_id: { type: String, min: 17, max: 17, unique: true, index: true, required: true },
	displayName: { type: String, min: 2, max: 32, required: true },
	songs: { type: Array },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now(), required: true }
};
