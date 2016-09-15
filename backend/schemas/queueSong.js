module.exports = mongoose => {

	var Schema = mongoose.Schema;

	var queueSongSchema = new Schema({
		_id: { type: String, length: 11, index: true, unique: true, required: true },
		title: { type: String, required: true },
		artists: [{ type: String, min: 1 }],
		duration: { type: Number, required: true },
		skipDuration: { type: Number, required: true, default: 0 },
		image: { type: String, required: true },
		likes: { type: Number, required: true },
		dislikes: { type: Number, required: true },
		genres: [{ type: String }],
		requestedBy: { type: String, required: true },
		requestedAt: { type: Date, required: true },
	});

	return queueSongSchema;
};
