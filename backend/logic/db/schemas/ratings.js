export default {
	mediaSource: { type: String, min: 11, max: 11, required: true, index: true, unique: true },
	likes: { type: Number, default: 0, required: true },
	dislikes: { type: Number, default: 0, required: true },
	documentVersion: { type: Number, default: 2, required: true }
};
