export default {
	createdAt: { type: Date, default: Date.now, required: true },
	hidden: { type: Boolean, default: false, required: true },
	userId: { type: String, required: true },
	type: {
		type: String,
		enum: [
			/** User */
			"user__joined",
			"user__edit_bio",
			"user__edit_avatar",
			"user__edit_name",
			"user__edit_location",
			"user__toggle_nightmode",
			"user__toggle_autoskip_disliked_songs",
			"user__toggle_activity_watch",
			/** Songs */
			"song__report",
			"song__like",
			"song__dislike",
			"song__unlike",
			"song__undislike",
			/** Stations */
			"station__favorite",
			"station__unfavorite",
			"station__create",
			"station__remove",
			"station__edit_name",
			"station__edit_display_name",
			"station__edit_description",
			"station__edit_theme",
			"station__edit_privacy",
			"station__edit_genres",
			"station__edit_blacklisted_genres",
			/** Playlists */
			"playlist__create",
			"playlist__remove",
			"playlist__remove_song",
			"playlist__remove_songs",
			"playlist__add_song",
			"playlist__add_songs",
			"playlist__edit_privacy",
			"playlist__edit_display_name",
			"playlist__import_playlist"
		],
		required: true
	},
	payload: {
		message: { type: String, default: "", required: true },
		thumbnail: { type: String, required: false },
		songId: { type: String, required: false },
		stationId: { type: String, required: false },
		playlistId: { type: String, required: false }
	},
	documentVersion: { type: Number, default: 1, required: true }
};
