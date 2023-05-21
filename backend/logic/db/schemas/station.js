import mongoose from "mongoose";

export default {
	name: { type: String, lowercase: true, maxlength: 16, minlength: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, minlength: 2, maxlength: 32, trim: true, required: true, unique: true },
	description: { type: String, minlength: 2, maxlength: 128, trim: true, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		type: {
			_id: { type: mongoose.Schema.Types.ObjectId },
			mediaSource: { type: String },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			skipVotes: [{ type: String }],
			requestedBy: { type: String },
			requestedAt: { type: Date },
			requestedType: { type: String, enum: ["manual", "autorequest", "autofill"] },
			verified: { type: Boolean }
		},
		default: null
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: mongoose.Schema.Types.ObjectId, required: true },
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	queue: [
		{
			_id: { type: mongoose.Schema.Types.ObjectId },
			mediaSource: { type: String, required: true },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			requestedBy: { type: String },
			requestedAt: { type: Date },
			requestedType: { type: String, enum: ["manual", "autorequest", "autofill"] },
			verified: { type: Boolean }
		}
	],
	owner: { type: String },
	requests: {
		enabled: { type: Boolean, default: true },
		access: { type: String, enum: ["owner", "user"], default: "owner" },
		limit: { type: Number, min: 1, max: 50, default: 5 },
		allowAutorequest: { type: Boolean, default: true, required: true },
		autorequestLimit: { type: Number, min: 1, max: 50, default: 3, required: true },
		autorequestDisallowRecentlyPlayedEnabled: { type: Boolean, default: true, required: true },
		autorequestDisallowRecentlyPlayedNumber: { type: Number, min: 1, max: 250, default: 50, required: true }
	},
	autofill: {
		enabled: { type: Boolean, default: true },
		playlists: [{ type: mongoose.Schema.Types.ObjectId, ref: "playlists" }],
		limit: { type: Number, min: 1, max: 50, default: 30 },
		mode: { type: String, enum: ["random", "sequential"], default: "random" }
	},
	theme: { type: String, enum: ["blue", "purple", "teal", "orange", "red"], default: "blue" },
	blacklist: [{ type: mongoose.Schema.Types.ObjectId, ref: "playlists" }],
	djs: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
	skipVoteThreshold: { type: Number, min: 0, max: 100, default: 50, required: true },
	documentVersion: { type: Number, default: 10, required: true }
};
