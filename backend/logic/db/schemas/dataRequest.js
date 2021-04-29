export default {
	userId: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, required: true },
	type: { type: String, required: true, enum: ["remove"] },
	resolved: { type: Boolean, default: false },
	documentVersion: { type: Number, default: 1, required: true }
};
