export default {
	type: { type: String, required: true, enum: ["youtube"] },
	query: { type: Object, required: true },
	status: { type: String, required: true, enum: ["success", "error", "in-progress"] },
	response: { type: Object, required: true },
	requestedBy: { type: String, required: true },
	requestedAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
