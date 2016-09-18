module.exports = mongoose => {

	const Schema = mongoose.Schema;

	const stationSchema = new Schema({
		_id: { type: String, lowercase: true, max: 16, min: 2, index: true, unique: true, required: true },
		type: { type: String, enum: ["official", "community"], required: true},
		displayName: { type: String, min: 2, max: 32, required: true },
		description: { type: String, min: 2, max: 128, required: true },
		privacy: { type: String, enum: ["public", "unlisted", "private"], default: "public", required: true },
		paused: { type: Boolean, default: false, required: true },
		currentSong: {
			startedAt: { type: Number, required: true },
			id: { type: String, length: 11, required: true },
			title: { type: String, required: true },
			artists: [{ type: String, min: 1 }],
			duration: { type: Number, required: true },
			skipDuration: { type: Number, required: true },
			image: { type: String, required: true },
			likes: { type: Number, required: true },
			dislikes: { type: Number, required: true },
			genres: [{ type: String }]
		},
		timePaused: { type: Number, default: 0, required: true },
		playlist: { type: String, required: true },
		genres: [{ type: String }],
		whitelist: [{ type: String }],
		partyMode: { type: Boolean, default: false, required: true },
		queueLocked: { type: Boolean, default: false, required: true },
		owner: { type: String }
	});

	return mongoose.model('station', stationSchema);
};
