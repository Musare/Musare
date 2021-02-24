export default {
	displayName: { type: String, min: 2, max: 32, required: true },
	isUserModifiable: { type: Boolean, default: true, required: true },
	songs: [
		{
			songId: { type: String },
			title: { type: String },
			duration: { type: Number },
			thumbnail: { type: String, required: false },
			artists: { type: Array, required: false },
			position: { type: Number }
		}
	],
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, required: true },
	createdFor: { type: String },
	privacy: { type: String, enum: ["public", "private"], default: "private" },
	type: { type: String, enum: ["user", "genre", "station"], required: true },
	documentVersion: { type: Number, default: 1, required: true }
};
