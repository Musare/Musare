export default {
	songId: { type: String, min: 11, max: 11, required: true, index: true, unique: true },
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
	acceptedBy: { type: String }, // TODO Should be verifiedBy
	acceptedAt: { type: Date }, // TODO Should be verifiedAt
	discogs: { type: Object },
	verified: { type: Boolean, required: true, default: false },
	documentVersion: { type: Number, default: 1, required: true }
};
