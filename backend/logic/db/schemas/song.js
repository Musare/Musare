export default {
	songId: { type: String, min: 11, max: 11, required: true, index: true },
	title: { type: String, required: true },
	artists: [{ type: String }],
	genres: [{ type: String }],
	duration: { type: Number, min: 1, required: true },
	skipDuration: { type: Number, required: true },
	thumbnail: { type: String, required: true },
	likes: { type: Number, default: 0, required: true },
	dislikes: { type: Number, default: 0, required: true },
	explicit: { type: Boolean, default: false, required: true },
	requestedBy: { type: String, required: true },
	requestedAt: { type: Date, required: true },
	acceptedBy: { type: String, required: true }, // TODO Should be verifiedBy
	acceptedAt: { type: Date, default: Date.now, required: true }, // TODO Should be verifiedAt
	discogs: { type: Object },
	verified: false,
	documentVersion: { type: Number, default: 1, required: true }
};
