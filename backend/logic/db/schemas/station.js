import mongoose from "mongoose";

export default {
	name: { type: String, lowercase: true, maxlength: 16, minlength: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, minlength: 2, maxlength: 32, required: true, unique: true },
	description: { type: String, minlength: 2, maxlength: 128, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		_id: { type: String },
		youtubeId: { type: String },
		title: { type: String },
		artists: [{ type: String }],
		duration: { type: Number },
		skipDuration: { type: Number },
		thumbnail: { type: String },
		skipVotes: [{ type: String }],
		requestedBy: { type: String },
		requestedAt: { type: Date },
		status: { type: String }
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: mongoose.Schema.Types.ObjectId, required: true },
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	locked: { type: Boolean, default: false },
	queue: [
		{
			youtubeId: { type: String, required: true },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			requestedBy: { type: String },
			requestedAt: { type: Date },
			status: { type: String }
		}
	],
	owner: { type: String },
	partyMode: { type: Boolean },
	playMode: { type: String, enum: ["random", "sequential"], default: "random" },
	theme: { type: String, enum: ["blue", "purple", "teal", "orange"], default: "blue" },
	includedPlaylists: [{ type: String }],
	excludedPlaylists: [{ type: String }],
	documentVersion: { type: Number, default: 6, required: true }
};
