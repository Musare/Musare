module.exports = {
	createdAt: { type: Date, default: Date.now, required: true },
	hidden: { type: Boolean, default: false, required: true },
	userId: { type: String, required: true },
	activityType: { type: String, enum: [
		"created_station",
		"deleted_station",
		"created_playlist",
		"deleted_playlist",
		"liked_song",
		"added_song_to_playlist",
		"added_songs_to_playlist"
	], required: true },
	payload: { type: Array, required: true }
}