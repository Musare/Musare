import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;
const SongsModule = moduleManager.modules.songs;
const ActivitiesModule = moduleManager.modules.activities;
const RatingsModule = moduleManager.modules.ratings;

CacheModule.runJob("SUB", {
	channel: "ratings.like",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:ratings.liked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						youtubeId: data.youtubeId,
						liked: true,
						disliked: false
					}
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "ratings.dislike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:ratings.disliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						youtubeId: data.youtubeId,
						liked: false,
						disliked: true
					}
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "ratings.unlike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:ratings.unliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						youtubeId: data.youtubeId,
						liked: false,
						disliked: false
					}
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "ratings.undislike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:ratings.undisliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						youtubeId: data.youtubeId,
						liked: false,
						disliked: false
					}
				});
			});
		});
	}
});

export default {
	/**
	 * Recalculates all ratings
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param cb
	 */
	recalculateAll: isAdminRequired(async function recalculateAll(session, cb) {
		async.waterfall(
			[
				next => {
					RatingsModule.runJob("RECALCULATE_ALL_RATINGS", {}, this)
						.then(() => {
							next();
						})
						.catch(err => {
							next(err);
						});
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "RATINGS_RECALCULATE_ALL", `Failed to recalculate all ratings. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "RATINGS_RECALCULATE_ALL", `Recalculated all ratings successfully.`);
				return cb({ status: "success", message: "Successfully recalculated all ratings." });
			}
		);
	}),

	/**
	 * Like
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	like: isLoginRequired(async function like(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								youtubeId,
								title,
								artists,
								thumbnail,
								duration,
								verified
							});
						})
						.catch(next);
				},

				(song, next) => userModel.findOne({ _id: session.userId }, (err, user) => next(err, song, user)),

				(song, user, next) => {
					if (!user) return next("User does not exist.");

					return this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, user.dislikedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song, user.likedSongsPlaylist))
						.catch(res => {
							if (!(res.message && res.message === "That song is not currently in the playlist."))
								return next("Unable to remove song from the 'Disliked Songs' playlist.");
							return next(null, song, user.likedSongsPlaylist);
						});
				},

				(song, likedSongsPlaylist, next) =>
					this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "addSongToPlaylist",
								args: [false, youtubeId, likedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song))
						.catch(res => {
							if (res.message && res.message === "That song is already in the playlist")
								return next("You have already liked this song.");
							return next("Unable to add song to the 'Liked Songs' playlist.");
						}),

				(song, next) => {
					RatingsModule.runJob("RECALCULATE_RATINGS", { youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_LIKE",
						`User "${session.userId}" failed to like song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.like",
					value: JSON.stringify({
						youtubeId,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__like",
					payload: {
						message: `Liked song <youtubeId>${song.title} by ${song.artists.join(", ")}</youtubeId>`,
						youtubeId,
						thumbnail: song.thumbnail
					}
				});

				return cb({
					status: "success",
					message: "You have successfully liked this song."
				});
			}
		);
	}),

	/**
	 * Dislike
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	dislike: isLoginRequired(async function dislike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								youtubeId,
								title,
								artists,
								thumbnail,
								duration,
								verified
							});
						})
						.catch(next);
				},

				(song, next) => userModel.findOne({ _id: session.userId }, (err, user) => next(err, song, user)),

				(song, user, next) => {
					if (!user) return next("User does not exist.");

					return this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, user.likedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song, user.dislikedSongsPlaylist))
						.catch(res => {
							if (!(res.message && res.message === "That song is not currently in the playlist."))
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song, user.dislikedSongsPlaylist);
						});
				},

				(song, dislikedSongsPlaylist, next) =>
					this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "addSongToPlaylist",
								args: [false, youtubeId, dislikedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song))
						.catch(res => {
							if (res.message && res.message === "That song is already in the playlist")
								return next("You have already disliked this song.");
							return next("Unable to add song to the 'Disliked Songs' playlist.");
						}),

				(song, next) => {
					RatingsModule.runJob("RECALCULATE_RATINGS", { youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_DISLIKE",
						`User "${session.userId}" failed to dislike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.dislike",
					value: JSON.stringify({
						youtubeId,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__dislike",
					payload: {
						message: `Disliked song <youtubeId>${song.title} by ${song.artists.join(", ")}</youtubeId>`,
						youtubeId,
						thumbnail: song.thumbnail
					}
				});

				return cb({
					status: "success",
					message: "You have successfully disliked this song."
				});
			}
		);
	}),

	/**
	 * Undislike
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	undislike: isLoginRequired(async function undislike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								youtubeId,
								title,
								artists,
								thumbnail,
								duration,
								verified
							});
						})
						.catch(next);
				},

				(song, next) => userModel.findOne({ _id: session.userId }, (err, user) => next(err, song, user)),

				(song, user, next) => {
					if (!user) return next("User does not exist.");

					return this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, user.dislikedSongsPlaylist]
							},
							this
						)
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Disliked Songs' playlist.");
							return next(null, song, user.likedSongsPlaylist);
						})
						.catch(err => next(err));
				},

				(song, likedSongsPlaylist, next) => {
					this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, likedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song))
						.catch(res => {
							if (!(res.message && res.message === "That song is not currently in the playlist."))
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song);
						});
				},

				(song, next) => {
					RatingsModule.runJob("RECALCULATE_RATINGS", { youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_UNDISLIKE",
						`User "${session.userId}" failed to undislike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.undislike",
					value: JSON.stringify({
						youtubeId,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__undislike",
					payload: {
						message: `Removed <youtubeId>${song.title} by ${song.artists.join(
							", "
						)}</youtubeId> from your Disliked Songs`,
						youtubeId,
						thumbnail: song.thumbnail
					}
				});

				return cb({
					status: "success",
					message: "You have successfully undisliked this song."
				});
			}
		);
	}),

	/**
	 * Unlike
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	unlike: isLoginRequired(async function unlike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								youtubeId,
								title,
								artists,
								thumbnail,
								duration,
								verified
							});
						})
						.catch(next);
				},

				(song, next) => userModel.findOne({ _id: session.userId }, (err, user) => next(err, song, user)),

				(song, user, next) => {
					if (!user) return next("User does not exist.");

					return this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, user.dislikedSongsPlaylist]
							},
							this
						)
						.then(() => next(null, song, user.likedSongsPlaylist))
						.catch(res => {
							if (!(res.message && res.message === "That song is not currently in the playlist."))
								return next("Unable to remove song from the 'Disliked Songs' playlist.");
							return next(null, song, user.likedSongsPlaylist);
						});
				},

				(song, likedSongsPlaylist, next) => {
					this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, likedSongsPlaylist]
							},
							this
						)
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song);
						})
						.catch(err => next(err));
				},

				(song, next) => {
					RatingsModule.runJob("RECALCULATE_RATINGS", { youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_UNLIKE",
						`User "${session.userId}" failed to unlike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.unlike",
					value: JSON.stringify({
						youtubeId,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__unlike",
					payload: {
						message: `Removed <youtubeId>${song.title} by ${song.artists.join(
							", "
						)}</youtubeId> from your Liked Songs`,
						youtubeId,
						thumbnail: song.thumbnail
					}
				});

				return cb({
					status: "success",
					message: "You have successfully unliked this song."
				});
			}
		);
	}),

	/**
	 * Get ratings
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */

	getRatings: isLoginRequired(async function getRatings(session, youtubeId, cb) {
		async.waterfall(
			[
				next => {
					RatingsModule.runJob("GET_RATINGS", { youtubeId, createMissing: true }, this)
						.then(res => next(null, res.ratings))
						.catch(next);
				},

				(ratings, next) => {
					next(null, {
						likes: ratings.likes,
						dislikes: ratings.dislikes
					});
				}
			],
			async (err, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_GET_RATINGS",
						`User "${session.userId}" failed to get ratings for ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				return cb({
					status: "success",
					data: {
						likes,
						dislikes
					}
				});
			}
		);
	}),

	/**
	 * Gets user's own ratings
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	getOwnRatings: isLoginRequired(async function getOwnRatings(session, youtubeId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId
						},
						this
					)
						.then(() => next())
						.catch(next);
				},

				next =>
					playlistModel.findOne(
						{ createdBy: session.userId, displayName: "Liked Songs" },
						(err, playlist) => {
							if (err) return next(err);
							if (!playlist) return next("'Liked Songs' playlist does not exist.");

							let isLiked = false;

							Object.values(playlist.songs).forEach(song => {
								// song is found in 'liked songs' playlist
								if (song.youtubeId === youtubeId) isLiked = true;
							});

							return next(null, isLiked);
						}
					),

				(isLiked, next) =>
					playlistModel.findOne(
						{ createdBy: session.userId, displayName: "Disliked Songs" },
						(err, playlist) => {
							if (err) return next(err);
							if (!playlist) return next("'Disliked Songs' playlist does not exist.");

							const ratings = { isLiked, isDisliked: false };

							Object.values(playlist.songs).forEach(song => {
								// song is found in 'disliked songs' playlist
								if (song.youtubeId === youtubeId) ratings.isDisliked = true;
							});

							return next(null, ratings);
						}
					)
			],
			async (err, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"RATINGS_GET_OWN_RATINGS",
						`User "${session.userId}" failed to get ratings for ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { isLiked, isDisliked } = ratings;

				return cb({
					status: "success",
					data: {
						youtubeId,
						liked: isLiked,
						disliked: isDisliked
					}
				});
			}
		);
	})
};
