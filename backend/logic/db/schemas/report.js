export default {
	resolved: { type: Boolean, default: false, required: true },
	song: {
		_id: { type: String, required: true },
		youtubeId: { type: String, required: true }
	},
	issues: [
		{
			category: {
				type: String,
				enum: ["custom", "video", "title", "duration", "artists", "thumbnail"],
				required: true
			},
			title: { type: String, required: true },
			description: { type: String, trim: true, required: false },
			resolved: { type: Boolean, default: false, required: true }
		}
	],
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 5, required: true }
};
