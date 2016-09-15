module.exports = mongoose => {

	const Schema = mongoose.Schema;

	const songSchema = new Schema({
		_id: { type: String, length: 11, index: true, unique: true, required: true },
		title: { type: String, required: true },
		artists: [{ type: String, min: 1 }],
		duration: { type: Number, required: true },
		skipDuration: { type: Number, required: true },
		image: { type: String, required: true },
		likes: { type: Number, required: true },
		dislikes: { type: Number, required: true },
		genres: [{ type: String }],
		acceptedBy: { type: String, required: true },
		acceptedAt: { type: Date, required: true },
		requestedBy: { type: String, required: true },
		requestedAt: { type: Date, required: true },
		reports: [{
			reportedBy: { type: String, required: true },
			reportedAt: { type: Date, required: true },
			reason: [{
				type: { type: String, enum: ["title", "artist", "image", "duration", "video"], required: true },
				message: { type: String, default: "" }
			}],
			resolved: { type: Boolean, required: true, default: false },
			resolvedBy: { type: String },
			resolvedAt: { type: String }
		}]
	});

	return songSchema;
};
