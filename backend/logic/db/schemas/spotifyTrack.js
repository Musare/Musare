export default {
	trackId: { type: String, unique: true },
	name: { type: String },

	albumId: { type: String },
	albumTitle: { type: String },
	albumImageUrl: { type: String },
	artists: [{ type: String }],
	artistIds: [{ type: String }],
	duration: { type: Number },
	explicit: { type: Boolean },
	externalIds: { type: Object },
	popularity: { type: Number },
	isLocal: { type: Boolean },

	createdAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
