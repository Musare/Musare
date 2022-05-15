export default {
	url: { type: String, required: true },
	date: { type: Date, default: Date.now, required: true },
	quotaCost: { type: Number, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
