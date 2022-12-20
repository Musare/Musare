import mongoose from "mongoose";

export default {
	stationId: { type: mongoose.Schema.Types.ObjectId, required: true },
	type: { type: String, enum: ["song_played"], required: true },
	payload: {
		song: {
			_id: { type: mongoose.Schema.Types.ObjectId },
			mediaSource: { type: String, min: 11, max: 11, required: true },
			title: { type: String, trim: true, required: true },
			artists: [{ type: String, trim: true, default: [] }],
			duration: { type: Number },
			thumbnail: { type: String },
			requestedBy: { type: String },
			requestedAt: { type: Date },
			verified: { type: Boolean }
		},
		skippedAt: { type: Date },
		skipReason: { type: String, enum: ["natural", "force_skip", "vote_skip", "other"] }
	},
	documentVersion: { type: Number, default: 2, required: true }
};
