import mongoose from "mongoose";

export default {
	name: { type: String, lowercase: true, maxlength: 16, minlength: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, minlength: 2, maxlength: 32, trim: true, required: true, unique: true },
	description: { type: String, minlength: 2, maxlength: 128, trim: true, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		_id: { type: mongoose.Schema.Types.ObjectId },
		youtubeId: { type: String },
		title: { type: String },
		artists: [{ type: String }],
		duration: { type: Number },
		skipDuration: { type: Number },
		thumbnail: { type: String },
		skipVotes: [{ type: String }],
		requestedBy: { type: String },
		requestedAt: { type: Date },
		verified: { type: Boolean }
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: mongoose.Schema.Types.ObjectId, required: true },
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	queue: [
		{
			_id: { type: mongoose.Schema.Types.ObjectId, required: true },
			youtubeId: { type: String, required: true },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			requestedBy: { type: String },
			requestedAt: { type: Date },
			verified: { type: Boolean }
		}
	],
	owner: { type: String },
	requests: {
		enabled: { type: Boolean, default: true },
		access: { type: String, enum: ["owner", "user"], default: "owner" },
		limit: { type: Number, min: 1, max: 50, default: 3 }
	},
	autofill: {
		enabled: { type: Boolean, default: true },
		playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "playlists" }],
		limit: { type: Number, min: 1, max: 50, default: 3 },
		mode: { type: String, enum: ["random", "sequential"], default: "random" }
	},
	theme: { type: String, enum: ["blue", "purple", "teal", "orange", "red"], default: "blue" },
	blacklist: [{ type: mongoose.Schema.Types.ObjectId, ref: "playlists" }],
	documentVersion: { type: Number, default: 7, required: true }
};
