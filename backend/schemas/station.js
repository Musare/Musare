module.exports = mongoose => mongoose.model('station', new mongoose.Schema({
	id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true},
	displayName: { type: String, min: 2, max: 32, required: true },
	description: { type: String, min: 2, max: 128, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		id: { type: String, unique: true, required: true },
		title: { type: String, required: true },
		artists: [{ type: String }],
		duration: { type: String, required: true },
		thumbnail: { type: String, required: true }
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	playlist: { type: Array, required: true },
	genres: [{ type: String }]
}));

