export default {
	youtubeId: { type: String, min: 11, max: 11, required: true, index: true, unique: true },
	title: { type: String, trim: true, required: true },
	artists: [{ type: String, trim: true, default: [] }],
	genres: [{ type: String, trim: true, default: [] }],
	tags: [{ type: String, trim: true, default: [] }],
	duration: { type: Number, min: 1, required: true },
	skipDuration: { type: Number, required: true, default: 0 },
	thumbnail: { type: String, trim: true },
	explicit: { type: Boolean },
	requestedBy: { type: String },
	requestedAt: { type: Date },
	verified: { type: Boolean, default: false },
	verifiedBy: { type: String },
	verifiedAt: { type: Date },
	discogs: { type: Object },
	documentVersion: { type: Number, default: 9, required: true }
};
