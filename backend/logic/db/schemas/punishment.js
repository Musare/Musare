module.exports = {
	type: { type: String, enum: ["banUserId", "banUserIp"], required: true },
	value: { type: String, required: true },
	reason: { type: String, required: true, default: 'Unknown' },
	active: { type: Boolean, required: true, default: true },
	expiresAt: { type: Date, required: true },
	punishedAt: { type: Date, default: Date.now(), required: true },
	punishedBy: { type: String, required: true }
};
