import async from "async";

import isLoginRequired from "../hooks/loginRequired";
import { useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;
const SongsModule = moduleManager.modules.songs;
const ActivitiesModule = moduleManager.modules.activities;
const MediaModule = moduleManager.modules.media;

CacheModule.runJob("SUB", {
	channel: "ratings.like",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.mediaSource}`,
			args: [
				"event:ratings.liked",
				{
					data: { mediaSource: data.mediaSource, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						mediaSource: data.mediaSource,
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
			room: `song.${data.mediaSource}`,
			args: [
				"event:ratings.disliked",
				{
					data: { mediaSource: data.mediaSource, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						mediaSource: data.mediaSource,
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
			room: `song.${data.mediaSource}`,
			args: [
				"event:ratings.unliked",
				{
					data: { mediaSource: data.mediaSource, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						mediaSource: data.mediaSource,
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
			room: `song.${data.mediaSource}`,
			args: [
				"event:ratings.undisliked",
				{
					data: { mediaSource: data.mediaSource, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:ratings.updated", {
					data: {
						mediaSource: data.mediaSource,
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
	 * @param {object} session - the session object automatically added by the websocket
	 * @param cb
	 */
	recalculateAllRatings: useHasPermission(
		"media.recalculateAllRatings",
		async function recalculateAllRatings(session, cb) {
			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Recalculate all ratings",
				message: "Recalculating all ratings.",
				id: this.toString()
			});
			await CacheModule.runJob("RPUSH", { key: `longJobs.${session.userId}`, value: this.toString() }, this);
			await CacheModule.runJob(
				"PUB",
				{
					channel: "longJob.added",
					value: { jobId: this.toString(), userId: session.userId }
				},
				this
			);

			async.waterfall(
				[
					next => {
						MediaModule.runJob("RECALCULATE_ALL_RATINGS", {}, this)
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
						this.log(
							"ERROR",
							"MEDIA_RECALCULATE_ALL_RATINGS",
							`Failed to recalculate all ratings. "${err}"`
						);
						this.publishProgress({
							status: "error",
							message: err
						});
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "MEDIA_RECALCULATE_ALL_RATINGS", `Recalculated all ratings successfully.`);
					this.publishProgress({
						status: "success",
						message: "Successfully recalculated all ratings."
					});
					return cb({ status: "success", message: "Successfully recalculated all ratings." });
				}
			);
		}
	),

	/**
	 * Like
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */
	like: isLoginRequired(async function like(session, mediaSource, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					MediaModule.runJob(
						"GET_MEDIA",
						{
							mediaSource
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								mediaSource,
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
								args: [mediaSource, user.dislikedSongsPlaylist]
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
								args: [false, mediaSource, likedSongsPlaylist]
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
					MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"MEDIA_RATINGS_LIKE",
						`User "${session.userId}" failed to like song ${mediaSource}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.like",
					value: JSON.stringify({
						mediaSource,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__like",
					payload: {
						message: `Liked song <mediaSource>${song.title} by ${song.artists.join(", ")}</mediaSource>`,
						mediaSource,
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
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */
	dislike: isLoginRequired(async function dislike(session, mediaSource, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					MediaModule.runJob(
						"GET_MEDIA",
						{
							mediaSource
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								mediaSource,
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
								args: [mediaSource, user.likedSongsPlaylist]
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
								args: [false, mediaSource, dislikedSongsPlaylist]
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
					MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"MEDIA_RATINGS_DISLIKE",
						`User "${session.userId}" failed to dislike song ${mediaSource}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.dislike",
					value: JSON.stringify({
						mediaSource,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__dislike",
					payload: {
						message: `Disliked song <mediaSource>${song.title} by ${song.artists.join(", ")}</mediaSource>`,
						mediaSource,
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
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */
	undislike: isLoginRequired(async function undislike(session, mediaSource, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					MediaModule.runJob(
						"GET_MEDIA",
						{
							mediaSource
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								mediaSource,
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
								args: [mediaSource, user.dislikedSongsPlaylist]
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
								args: [mediaSource, likedSongsPlaylist]
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
					MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"MEDIA_RATINGS_UNDISLIKE",
						`User "${session.userId}" failed to undislike song ${mediaSource}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.undislike",
					value: JSON.stringify({
						mediaSource,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__undislike",
					payload: {
						message: `Removed <mediaSource>${song.title} by ${song.artists.join(
							", "
						)}</mediaSource> from your Disliked Songs`,
						mediaSource,
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
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */
	unlike: isLoginRequired(async function unlike(session, mediaSource, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					MediaModule.runJob(
						"GET_MEDIA",
						{
							mediaSource
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, artists, thumbnail, duration, verified } = song;
							next(null, {
								_id,
								mediaSource,
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
								args: [mediaSource, user.dislikedSongsPlaylist]
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
								args: [mediaSource, likedSongsPlaylist]
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
					MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"MEDIA_RATINGS_UNLIKE",
						`User "${session.userId}" failed to unlike song ${mediaSource}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { likes, dislikes } = ratings;

				if (song._id) SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "ratings.unlike",
					value: JSON.stringify({
						mediaSource,
						userId: session.userId,
						likes,
						dislikes
					})
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "song__unlike",
					payload: {
						message: `Removed <mediaSource>${song.title} by ${song.artists.join(
							", "
						)}</mediaSource> from your Liked Songs`,
						mediaSource,
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
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */

	async getRatings(session, mediaSource, cb) {
		async.waterfall(
			[
				next => {
					MediaModule.runJob("GET_RATINGS", { mediaSource, createMissing: true }, this)
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
						"MEDIA_GET_RATINGS",
						`User "${session.userId}" failed to get ratings for ${mediaSource}. "${err}"`
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
	},

	/**
	 * Gets user's own ratings
	 * @param session
	 * @param mediaSource - the media source
	 * @param cb
	 */
	getOwnRatings: isLoginRequired(async function getOwnRatings(session, mediaSource, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					MediaModule.runJob(
						"GET_MEDIA",
						{
							mediaSource
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
								if (song.mediaSource === mediaSource) isLiked = true;
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
								if (song.mediaSource === mediaSource) ratings.isDisliked = true;
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
						"MEDIA_GET_OWN_RATINGS",
						`User "${session.userId}" failed to get ratings for ${mediaSource}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { isLiked, isDisliked } = ratings;

				return cb({
					status: "success",
					data: {
						mediaSource,
						liked: isLiked,
						disliked: isDisliked
					}
				});
			}
		);
	}),

	/**
	 * Gets importJobs, used in the admin import page by the AdvancedTable component
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each news item
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getImportJobs: useHasPermission(
		"admin.view.import",
		async function getImportJobs(session, page, pageSize, properties, sort, queries, operator, cb) {
			async.waterfall(
				[
					next => {
						DBModule.runJob(
							"GET_DATA",
							{
								page,
								pageSize,
								properties,
								sort,
								queries,
								operator,
								modelName: "importJob",
								blacklistedProperties: [],
								specialProperties: {},
								specialQueries: {}
							},
							this
						)
							.then(response => {
								next(null, response);
							})
							.catch(err => {
								next(err);
							});
					}
				],
				async (err, response) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log("ERROR", "MEDIA_GET_IMPORT_JOBS", `Failed to get import jobs. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "MEDIA_GET_IMPORT_JOBS", `Fetched import jobs successfully.`);
					return cb({
						status: "success",
						message: "Successfully fetched import jobs.",
						data: response
					});
				}
			);
		}
	),

	/**
	 * Remove import jobs
	 * @returns {{status: string, data: object}}
	 */
	removeImportJobs: useHasPermission("media.removeImportJobs", function removeImportJobs(session, jobIds, cb) {
		MediaModule.runJob("REMOVE_IMPORT_JOBS", { jobIds }, this)
			.then(() => {
				this.log("SUCCESS", "MEDIA_REMOVE_IMPORT_JOBS", `Removing import jobs was successful.`);

				return cb({ status: "success", message: "Successfully removed import jobs" });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "MEDIA_REMOVE_IMPORT_JOBS", `Removing import jobs failed. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Gets an array of media from media sources
	 * @returns {{status: string, data: object}}
	 */
	getMediaFromMediaSources: isLoginRequired(function getMediaFromMediaSources(session, mediaSources, cb) {
		MediaModule.runJob("GET_MEDIA_FROM_MEDIA_SOURCES", { mediaSources }, this)
			.then(songMap => {
				this.log("SUCCESS", "MEDIA_GET_MEDIA_FROM_MEDIA_SOURCES", `GET_MEDIA_FROM_MEDIA_SOURCES successful.`);

				return cb({ status: "success", message: "GET_MEDIA_FROM_MEDIA_SOURCES success", data: { songMap } });
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"MEDIA_GET_MEDIA_FROM_MEDIA_SOURCES",
					`GET_MEDIA_FROM_MEDIA_SOURCES failed. "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	})
};
