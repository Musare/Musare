module.exports = {
	_id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, min: 2, max: 32, required: true },
	description: { type: String, min: 2, max: 128, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		_id: { type: String, unique: true, required: true },
		title: { type: String, required: true },
		artists: [{ type: String }],
		duration: { type: Number, required: true },
		skipDuration: { type: Number, required: true },
		thumbnail: { type: String, required: true },
		likes: { type: Number, default: -1, required: true },
		dislikes: { type: Number, default: -1, required: true },
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: Array, required: true },
	genres: [{ type: String }],
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	locked: { type: Boolean, default: false },
	queue: [{
		songId: { type: String, required: true },
		requestedBy: { type: String, required: true }
	}]
};
