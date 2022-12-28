export default {
	trackId: { type: Number },
	title: { type: String },
	artworkUrl: { type: String },
	soundcloudCreatedAt: { type: Date },
	duration: { type: Number },
	genre: { type: String },
	kind: { type: String },
	license: { type: String },
	likesCount: { type: Number },
	playbackCount: { type: Number },
	public: { type: Boolean },
	tagList: { type: String },
	userId: { type: Number },
	username: { type: String },
	createdAt: { type: Date, default: Date.now, required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
