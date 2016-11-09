module.exports = mongoose => mongoose.model('song', new mongoose.Schema({
	id: { type: String, unique: true, required: true },
	title: { type: String, required: true },
	artists: [{ type: String }],
	duration: { type: String, required: true },
	thumbnail: { type: String, required: true }
}));
