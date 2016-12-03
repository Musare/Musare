module.exports = {
	_id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, min: 2, max: 32, required: true },
	description: { type: String, min: 2, max: 128, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		_id: { type: String },
		title: { type: String },
		artists: [{ type: String }],
		duration: { type: Number },
		skipDuration: { type: Number },
		thumbnail: { type: String },
		likes: { type: Number, default: -1 },
		dislikes: { type: Number, default: -1 },
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: Array },
	genres: [{ type: String }],
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	locked: { type: Boolean, default: false },
	queue: [{
		_id: { type: String, required: true },
		title: { type: String },
		duration: { type: Number },
		requestedBy: { type: String, required: true }
	}]
};
