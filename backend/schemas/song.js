module.exports = mongoose => {

	const Schema = mongoose.Schema;

	const songSchema = new Schema({
		id: { type: String, length: 11, index: true, unique: true, required: true },
		title: { type: String, required: true },
		artists: [{ type: String, min: 1 }],
		duration: { type: Number, required: true },
		thumbnail: { type: String, required: true }
	});

	return songSchema;
};
