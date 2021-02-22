import mongoose from "mongoose";

export default {
	username: { type: String, required: true },
	role: { type: String, default: "default", required: true },
	email: {
		verified: { type: Boolean, default: false, required: true },
		verificationToken: String,
		address: String
	},
	avatar: {
		type: { type: String, enum: ["gravatar", "initials"], required: true },
		url: { type: String, required: false },
		color: { type: String, enum: ["blue", "orange", "green", "purple", "teal"], required: false }
	},
	services: {
		password: {
			password: String,
			reset: {
				code: { type: String, min: 8, max: 8 },
				expires: { type: Date }
			},
			set: {
				code: { type: String, min: 8, max: 8 },
				expires: { type: Date }
			}
		},
		github: {
			id: Number,
			access_token: String
		}
	},
	statistics: {
		songsRequested: { type: Number, default: 0, required: true }
	},
	likedSongsPlaylist: { type: mongoose.Schema.Types.ObjectId },
	dislikedSongsPlaylist: { type: mongoose.Schema.Types.ObjectId },
	favoriteStations: [{ type: String }],
	name: { type: String, default: "" },
	location: { type: String, default: "" },
	bio: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
	preferences: {
		orderOfPlaylists: [{ type: mongoose.Schema.Types.ObjectId }],
		nightmode: { type: Boolean, default: false, required: true },
		autoSkipDisliked: { type: Boolean, default: true, required: true },
		activityLogPublic: { type: Boolean, default: false, required: true }
	},
	documentVersion: { type: Number, default: 1, required: true }
};
