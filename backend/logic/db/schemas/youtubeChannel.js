export default {
	channelId: { type: String, required: true, index: true, unique: true },
	title: { type: String, trim: true, required: true },
	customUrl: { type: String, trim: true },
	rawData: { type: Object },
	createdAt: { type: Date, default: Date.now, required: true },
	updatedAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
