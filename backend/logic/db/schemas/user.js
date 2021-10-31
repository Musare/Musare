module.exports = {
	username: { type: String, required: true },
	role: { type: String, default: 'default', required: true },
	email: {
		verified: { type: Boolean, default: false, required: true },
		verificationToken: String,
		address: String
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
	liked: [{ type: String }],
	disliked: [{ type: String }],
	favoriteStations: [{ type: String }],
	createdAt: { type: Date, default: Date.now() }
};
