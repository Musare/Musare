import mongoose from "mongoose";

export default {
	displayName: { type: String, min: 2, max: 32, trim: true, required: true },
	songs: [
		{
			_id: { type: mongoose.Schema.Types.ObjectId },
			youtubeId: { type: String, required: true },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			verified: { type: Boolean }
		}
	],
	createdBy: { type: String, required: true },
	createdAt: { type: Date, default: Date.now, required: true },
	createdFor: { type: String },
	privacy: { type: String, enum: ["public", "private"], default: "private" },
	type: { type: String, enum: ["user", "user-liked", "user-disliked", "genre", "station", "admin"], required: true },
	documentVersion: { type: Number, default: 6, required: true }
};
