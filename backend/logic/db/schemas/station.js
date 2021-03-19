import mongoose from "mongoose";

export default {
	name: { type: String, lowercase: true, maxlength: 16, minlength: 2, index: true, unique: true, required: true },
	type: { type: String, enum: ["official", "community"], required: true },
	displayName: { type: String, minlength: 2, maxlength: 32, required: true, unique: true },
	description: { type: String, minlength: 2, maxlength: 128, required: true },
	paused: { type: Boolean, default: false, required: true },
	currentSong: {
		_id: { type: String },
		songId: { type: String },
		title: { type: String },
		artists: [{ type: String }],
		duration: { type: Number },
		skipDuration: { type: Number },
		thumbnail: { type: String },
		likes: { type: Number, default: -1 },
		dislikes: { type: Number, default: -1 },
		skipVotes: [{ type: String }],
		requestedAt: { type: Date }
	},
	currentSongIndex: { type: Number, default: 0, required: true },
	timePaused: { type: Number, default: 0, required: true },
	pausedAt: { type: Number, default: 0, required: true },
	startedAt: { type: Number, default: 0, required: true },
	playlist: { type: Array },
	playlist2: { type: mongoose.Schema.Types.ObjectId, required: true },
	genres: [{ type: String }],
	blacklistedGenres: [{ type: String }],
	privacy: { type: String, enum: ["public", "unlisted", "private"], default: "private" },
	locked: { type: Boolean, default: false },
	queue: [
		{
			songId: { type: String, required: true },
			title: { type: String },
			artists: [{ type: String }],
			duration: { type: Number },
			skipDuration: { type: Number },
			thumbnail: { type: String },
			likes: { type: Number, default: -1 },
			dislikes: { type: Number, default: -1 },
			requestedBy: { type: String },
			requestedAt: { type: Date }
		}
	],
	owner: { type: String },
	privatePlaylist: { type: mongoose.Schema.Types.ObjectId },
	partyMode: { type: Boolean },
	theme: { type: String, enum: ["blue", "purple", "teal", "orange"], default: "blue" },
	includedPlaylists: [{ type: String }],
	excludedPlaylists: [{ type: String }],
	documentVersion: { type: Number, default: 2, required: true }
};
