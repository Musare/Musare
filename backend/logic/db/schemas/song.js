export default {
	youtubeId: { type: String, min: 11, max: 11, required: true, index: true, unique: true },
	title: { type: String, required: true },
	artists: [{ type: String, default: [] }],
	genres: [{ type: String, default: [] }],
	duration: { type: Number, min: 1, required: true },
	skipDuration: { type: Number, required: true, default: 0 },
	thumbnail: { type: String },
	likes: { type: Number, default: 0, required: true },
	dislikes: { type: Number, default: 0, required: true },
	explicit: { type: Boolean },
	requestedBy: { type: String },
	requestedAt: { type: Date },
	verifiedBy: { type: String },
	verifiedAt: { type: Date },
	discogs: { type: Object },
	status: { type: String, required: true, default: "hidden", enum: ["hidden", "unverified", "verified"] },
	documentVersion: { type: Number, default: 5, required: true }
};
