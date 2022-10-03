export default {
	youtubeId: { type: String, min: 11, max: 11, required: true, index: true, unique: true },
	title: { type: String, trim: true, required: true },
	author: { type: String, trim: true, required: true },
	duration: { type: Number, required: true },
	uploadedAt: { type: Number },
	createdAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
