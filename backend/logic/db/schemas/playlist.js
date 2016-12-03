module.exports = {
	_id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
	displayName: { type: String, min: 2, max: 32, required: true },
	songs: { type: Array },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now(), required: true }
};
