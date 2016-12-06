module.exports = {
	name: { type: String, lowercase: true, max: 16, min: 2 },
	displayName: { type: String, min: 2, max: 32, required: true },
	songs: { type: Array },
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now(), required: true }
};
