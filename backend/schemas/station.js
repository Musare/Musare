module.exports = mongoose => {

	const Schema = mongoose.Schema;

	const stationSchema = new Schema({
		id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
		type: { type: String, enum: ["official", "community"], required: true},
		displayName: { type: String, min: 2, max: 32, required: true },
		description: { type: String, min: 2, max: 128, required: true },
		paused: { type: Boolean, default: false, required: true },
		currentSong: {
			id: { type: String, length: 11, index: true, unique: true, required: true },
			title: { type: String, required: true },
			artists: [{ type: String, min: 1 }],
			duration: { type: Number, required: true },
			thumbnail: { type: String, required: true }
		},
		currentSongIndex: { type: Number, default: 0, required: true },
		timePaused: { type: Number, default: 0, required: true },
		playlist: { type: Object, required: true },
		genres: [{ type: String }]
	});

	return mongoose.model('station', stationSchema);
};
