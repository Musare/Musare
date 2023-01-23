export default {
	artistId: { type: String, unique: true },

	rawData: { type: Object },

	createdAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
