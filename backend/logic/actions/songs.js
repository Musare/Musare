import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const CacheModule = moduleManager.modules.cache;
const SongsModule = moduleManager.modules.songs;
const ActivitiesModule = moduleManager.modules.activities;
const YouTubeModule = moduleManager.modules.youtube;
const PlaylistsModule = moduleManager.modules.playlists;

CacheModule.runJob("SUB", {
	channel: "song.updated",
	cb: async data => {
		const songModel = await DBModule.runJob("GET_MODEL", {
			modelName: "song"
		});

		songModel.findOne({ _id: data.songId }, (err, song) => {
			WSModule.runJob("EMIT_TO_ROOMS", {
				rooms: [
					"import-album",
					"admin.songs",
					"admin.unverifiedSongs",
					"admin.hiddenSongs",
					`edit-song.${data.songId}`
				],
				args: ["event:admin.song.updated", { data: { song, oldStatus: data.oldStatus } }]
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "song.like",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:song.liked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:song.ratings.updated", {
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
	channel: "song.dislike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:song.disliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:song.ratings.updated", {
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
	channel: "song.unlike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:song.unliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:song.ratings.updated", {
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
	channel: "song.undislike",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `song.${data.youtubeId}`,
			args: [
				"event:song.undisliked",
				{
					data: { youtubeId: data.youtubeId, likes: data.likes, dislikes: data.dislikes }
				}
			]
		});

		WSModule.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:song.ratings.updated", {
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
	 * Returns the length of the songs list
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param cb
	 */
	length: isAdminRequired(async function length(session, cb) {
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
		async.waterfall(
			[
				next => {
					songModel.countDocuments({}, next);
				}
			],
			async (err, count) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_LENGTH", `Failed to get length from songs. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_LENGTH", `Got length from songs successfully.`);
				return cb({ status: "success", message: "Successfully got length of songs.", data: { length: count } });
			}
		);
	}),

	/**
	 * Gets a set of songs
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param set - the set number to return
	 * @param cb
	 */
	getSet: isAdminRequired(async function getSet(session, set, cb) {
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
		async.waterfall(
			[
				next => {
					songModel
						.find({})
						.skip(15 * (set - 1))
						.limit(15)
						.exec(next);
				}
			],
			async (err, songs) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_GET_SET", `Failed to get set from songs. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_GET_SET", `Got set from songs successfully.`);
				return cb({ status: "success", message: "Successfully got set of songs.", data: { songs } });
			}
		);
	}),

	/**
	 * Gets songs, used in the admin songs page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each song
	 * @param sort - the sort object
	 * @param cb
	 */
	 getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("GET_DATA", {
						page,
						pageSize,
						properties,
						sort
					}, this)
					.then(response => {
						next(null, response);
					})
					.catch(err => {
						next(err);
					});
				}
			],
			async (err, response) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_GET_DATA", `Failed to get data from songs. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_GET_DATA", `Got data from songs successfully.`);
				return cb({ status: "success", message: "Successfully got data from songs.", data: response });
			}
		);
	}),

	/**
	 * Updates all songs
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param cb
	 */
	updateAll: isAdminRequired(async function updateAll(session, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("UPDATE_ALL_SONGS", {}, this)
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
					this.log("ERROR", "SONGS_UPDATE_ALL", `Failed to update all songs. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_UPDATE_ALL", `Updated all songs successfully.`);
				return cb({ status: "success", message: "Successfully updated all songs." });
			}
		);
	}),

	/**
	 * Recalculates all song ratings
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param cb
	 */
	recalculateAllRatings: isAdminRequired(async function recalculateAllRatings(session, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("RECALCULATE_ALL_SONG_RATINGS", {}, this)
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
						"SONGS_RECALCULATE_ALL_RATINGS",
						`Failed to recalculate all song ratings. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_RECALCULATE_ALL_RATINGS", `Recalculated all song ratings successfully.`);
				return cb({ status: "success", message: "Successfully recalculated all song ratings." });
			}
		);
	}),

	/**
	 * Gets a song from the Musare song id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the song id
	 * @param {Function} cb
	 */
	getSongFromSongId: isAdminRequired(function getSongFromSongId(session, songId, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("GET_SONG", { songId }, this)
						.then(response => next(null, response.song))
						.catch(err => next(err));
				}
			],
			async (err, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_GET_SONG_FROM_MUSARE_ID", `Failed to get song ${songId}. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_GET_SONG_FROM_MUSARE_ID", `Got song ${songId} successfully.`);
				return cb({ status: "success", data: { song } });
			}
		);
	}),

	/**
	 * Updates a song
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the song id
	 * @param {object} song - the updated song object
	 * @param {Function} cb
	 */
	update: isAdminRequired(async function update(session, songId, song, cb) {
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
		let existingSong = null;
		async.waterfall(
			[
				next => {
					songModel.findOne({ _id: songId }, next);
				},

				(_existingSong, next) => {
					existingSong = _existingSong;
					songModel.updateOne({ _id: songId }, song, { runValidators: true }, next);
				},

				(res, next) => {
					SongsModule.runJob("UPDATE_SONG", { songId }, this)
						.then(song => {
							existingSong.genres
								.concat(song.genres)
								.filter((value, index, self) => self.indexOf(value) === index)
								.forEach(genre => {
									PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre })
										.then(() => {})
										.catch(() => {});
								});

							next(null, song);
						})
						.catch(next);
				}
			],
			async (err, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "SONGS_UPDATE", `Failed to update song "${songId}". "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "SONGS_UPDATE", `Successfully updated song "${songId}".`);

				return cb({
					status: "success",
					message: "Song has been successfully updated",
					data: { song }
				});
			}
		);
	}),

	// /**
	//  * Removes a song
	//  *
	//  * @param session
	//  * @param songId - the song id
	//  * @param cb
	//  */
	// remove: isAdminRequired(async function remove(session, songId, cb) {
	// 	const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
	// 	let song = null;
	// 	async.waterfall(
	// 		[
	// 			next => {
	// 				songModel.findOne({ _id: songId }, next);
	// 			},

	// 			(_song, next) => {
	// 				song = _song;
	// 				songModel.deleteOne({ _id: songId }, next);
	// 			},

	// 			(res, next) => {
	// 				CacheModule.runJob("HDEL", { table: "songs", key: songId }, this)
	// 					.then(() => {
	// 						next();
	// 					})
	// 					.catch(next)
	// 					.finally(() => {
	// 						song.genres.forEach(genre => {
	// 							PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre })
	// 								.then(() => {})
	// 								.catch(() => {});
	// 						});
	// 					});
	// 			}
	// 		],
	// 		async err => {
	// 			if (err) {
	// 				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

	// 				this.log("ERROR", "SONGS_REMOVE", `Failed to remove song "${songId}". "${err}"`);

	// 				return cb({ status: "error", message: err });
	// 			}

	// 			this.log("SUCCESS", "SONGS_REMOVE", `Successfully removed song "${songId}".`);

	// 			if (song.status === "verified") {
	// 				CacheModule.runJob("PUB", {
	// 					channel: "song.removedVerifiedSong",
	// 					value: songId
	// 				});
	// 			}
	// 			if (song.status === "unverified") {
	// 				CacheModule.runJob("PUB", {
	// 					channel: "song.removedUnverifiedSong",
	// 					value: songId
	// 				});
	// 			}
	// 			if (song.status === "hidden") {
	// 				CacheModule.runJob("PUB", {
	// 					channel: "song.removedHiddenSong",
	// 					value: songId
	// 				});
	// 			}

	// 			return cb({
	// 				status: "success",
	// 				message: "Song has been successfully removed"
	// 			});
	// 		}
	// 	);
	// }),

	/**
	 * Searches through official songs
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} query - the query
	 * @param {string} page - the page
	 * @param {Function} cb - gets called with the result
	 */
	searchOfficial: isLoginRequired(async function searchOfficial(session, query, page, cb) {
		async.waterfall(
			[
				next => {
					if ((!query && query !== "") || typeof query !== "string") next("Invalid query.");
					else next();
				},

				next => {
					SongsModule.runJob("SEARCH", {
						query,
						includeVerified: true,
						trimmed: true,
						page
					})
						.then(response => {
							next(null, response);
						})
						.catch(err => {
							next(err);
						});
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_SEARCH_OFFICIAL", `Searching songs failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "SONGS_SEARCH_OFFICIAL", "Searching songs successful.");
				return cb({ status: "success", data });
			}
		);
	}),

	/**
	 * Requests a song
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} youtubeId - the youtube id of the song that gets requested
	 * @param {string} returnSong - returns the simple song
	 * @param {Function} cb - gets called with the result
	 */
	request: isLoginRequired(async function add(session, youtubeId, returnSong, cb) {
		SongsModule.runJob("REQUEST_SONG", { youtubeId, userId: session.userId }, this)
			.then(response => {
				this.log(
					"SUCCESS",
					"SONGS_REQUEST",
					`User "${session.userId}" successfully requested song "${youtubeId}".`
				);
				return cb({
					status: "success",
					message: "Successfully requested that song",
					song: returnSong ? response.song : null
				});
			})
			.catch(async _err => {
				const err = await UtilsModule.runJob("GET_ERROR", { error: _err }, this);
				this.log(
					"ERROR",
					"SONGS_REQUEST",
					`Requesting song "${youtubeId}" failed for user ${session.userId}. "${err}"`
				);
				return cb({ status: "error", message: err, song: returnSong && _err.data ? _err.data.song : null });
			});
	}),

	/**
	 * Hides a song
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the song id of the song that gets hidden
	 * @param {Function} cb - gets called with the result
	 */
	hide: isLoginRequired(async function add(session, songId, cb) {
		SongsModule.runJob("HIDE_SONG", { songId }, this)
			.then(() => {
				this.log("SUCCESS", "SONGS_HIDE", `User "${session.userId}" successfully hid song "${songId}".`);
				return cb({
					status: "success",
					message: "Successfully hid that song"
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log("ERROR", "SONGS_HIDE", `Hiding song "${songId}" failed for user ${session.userId}. "${err}"`);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Unhides a song
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} songId - the song id of the song that gets hidden
	 * @param {Function} cb - gets called with the result
	 */
	unhide: isLoginRequired(async function add(session, songId, cb) {
		SongsModule.runJob("UNHIDE_SONG", { songId }, this)
			.then(() => {
				this.log("SUCCESS", "SONGS_UNHIDE", `User "${session.userId}" successfully unhid song "${songId}".`);
				return cb({
					status: "success",
					message: "Successfully unhid that song"
				});
			})
			.catch(async err => {
				err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
				this.log(
					"ERROR",
					"SONGS_UNHIDE",
					`Unhiding song "${songId}" failed for user ${session.userId}. "${err}"`
				);
				return cb({ status: "error", message: err });
			});
	}),

	/**
	 * Verifies a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 */
	verify: isAdminRequired(async function add(session, songId, cb) {
		const SongModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
		async.waterfall(
			[
				next => {
					SongModel.findOne({ _id: songId }, next);
				},

				(song, next) => {
					if (!song) return next("This song is not in the database.");
					return next(null, song);
				},

				(song, next) => {
					const oldStatus = song.status;

					song.verifiedBy = session.userId;
					song.verifiedAt = Date.now();
					song.status = "verified";

					song.save(err => next(err, song, oldStatus));
				},

				(song, oldStatus, next) => {
					song.genres.forEach(genre => {
						PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre })
							.then(() => {})
							.catch(() => {});
					});

					SongsModule.runJob("UPDATE_SONG", { songId: song._id, oldStatus });
					next(null, song, oldStatus);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "SONGS_VERIFY", `User "${session.userId}" failed to verify song. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "SONGS_VERIFY", `User "${session.userId}" successfully verified song "${songId}".`);

				return cb({
					status: "success",
					message: "Song has been verified successfully."
				});
			}
		);
		// TODO Check if video is in queue and Add the song to the appropriate stations
	}),

	/**
	 * Un-verifies a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 */
	unverify: isAdminRequired(async function add(session, songId, cb) {
		const SongModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);
		async.waterfall(
			[
				next => {
					SongModel.findOne({ _id: songId }, next);
				},

				(song, next) => {
					if (!song) return next("This song is not in the database.");
					return next(null, song);
				},

				(song, next) => {
					song.status = "unverified";
					song.save(err => {
						next(err, song);
					});
				},

				(song, next) => {
					song.genres.forEach(genre => {
						PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre })
							.then(() => {})
							.catch(() => {});
					});

					SongsModule.runJob("UPDATE_SONG", { songId, oldStatus: "verified" });

					next(null);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "SONGS_UNVERIFY", `User "${session.userId}" failed to verify song. "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"SONGS_UNVERIFY",
					`User "${session.userId}" successfully unverified song "${songId}".`
				);

				return cb({
					status: "success",
					message: "Song has been unverified successfully."
				});
			}
		);
		// TODO Check if video is in queue and Add the song to the appropriate stations
	}),

	/**
	 * Requests a set of songs
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {boolean} musicOnly - whether to only get music from the playlist
	 * @param {Function} cb - gets called with the result
	 */
	requestSet: isLoginRequired(function requestSet(session, url, musicOnly, returnSongs, cb) {
		async.waterfall(
			[
				next => {
					YouTubeModule.runJob(
						"GET_PLAYLIST",
						{
							url,
							musicOnly
						},
						this
					)
						.then(res => {
							next(null, res.songs);
						})
						.catch(next);
				},
				(youtubeIds, next) => {
					let successful = 0;
					let songs = {};
					let failed = 0;
					let alreadyInDatabase = 0;

					if (youtubeIds.length === 0) next();

					async.eachOfLimit(
						youtubeIds,
						1,
						(youtubeId, index, next) => {
							WSModule.runJob(
								"RUN_ACTION2",
								{
									session,
									namespace: "songs",
									action: "request",
									args: [youtubeId, returnSongs]
								},
								this
							)
								.then(res => {
									if (res.status === "success") successful += 1;
									else failed += 1;
									if (res.message === "This song is already in the database.") alreadyInDatabase += 1;
									if (res.song) songs[index] = res.song;
									else songs[index] = null;
								})
								.catch(() => {
									failed += 1;
								})
								.finally(() => {
									next();
								});
						},
						() => {
							if (returnSongs)
								songs = Object.keys(songs)
									.sort()
									.map(key => songs[key]);

							next(null, { successful, failed, alreadyInDatabase, songs });
						}
					);
				}
			],
			async (err, response) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REQUEST_SET",
						`Importing a YouTube playlist to be requested failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"REQUEST_SET",
					`Successfully imported a YouTube playlist to be requested for user "${session.userId}".`
				);
				return cb({
					status: "success",
					message: `Playlist is done importing. ${response.successful} were added succesfully, ${response.failed} failed (${response.alreadyInDatabase} were already in database)`,
					songs: returnSongs ? response.songs : null
				});
			}
		);
	}),

	/**
	 * Likes a song
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	like: isLoginRequired(async function like(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => songModel.findOne({ youtubeId }, next),

				(song, next) => {
					if (!song) return next("No song found with that id.");
					return next(null, song);
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
								action: "addSongToPlaylist",
								args: [false, youtubeId, user.likedSongsPlaylist]
							},
							this
						)
						.then(res => {
							if (res.status === "error") {
								if (res.message === "That song is already in the playlist")
									return next("You have already liked this song.");
								return next("Unable to add song to the 'Liked Songs' playlist.");
							}

							return next(null, song, user.dislikedSongsPlaylist);
						})
						.catch(err => next(err));
				},

				(song, dislikedSongsPlaylist, next) => {
					this.module
						.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "removeSongFromPlaylist",
								args: [youtubeId, dislikedSongsPlaylist]
							},
							this
						)
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Disliked Songs' playlist.");
							return next(null, song);
						})
						.catch(err => next(err));
				},

				(song, next) => {
					SongsModule.runJob("RECALCULATE_SONG_RATINGS", { songId: song._id, youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, { likes, dislikes }) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_LIKE",
						`User "${session.userId}" failed to like song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "song.like",
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
	 * Dislikes a song
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	dislike: isLoginRequired(async function dislike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => {
					songModel.findOne({ youtubeId }, next);
				},

				(song, next) => {
					if (!song) return next("No song found with that id.");
					return next(null, song);
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
								action: "addSongToPlaylist",
								args: [false, youtubeId, user.dislikedSongsPlaylist]
							},
							this
						)
						.then(res => {
							if (res.status === "error") {
								if (res.message === "That song is already in the playlist")
									return next("You have already disliked this song.");
								return next("Unable to add song to the 'Disliked Songs' playlist.");
							}

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
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song);
						})
						.catch(err => next(err));
				},

				(song, next) => {
					SongsModule.runJob("RECALCULATE_SONG_RATINGS", { songId: song._id, youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, { likes, dislikes }) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_DISLIKE",
						`User "${session.userId}" failed to dislike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "song.dislike",
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
	 * Undislikes a song
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	undislike: isLoginRequired(async function undislike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => {
					songModel.findOne({ youtubeId }, next);
				},

				(song, next) => {
					if (!song) return next("No song found with that id.");
					return next(null, song);
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
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song);
						})
						.catch(err => next(err));
				},

				(song, next) => {
					SongsModule.runJob("RECALCULATE_SONG_RATINGS", { songId: song._id, youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, { likes, dislikes }) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_UNDISLIKE",
						`User "${session.userId}" failed to undislike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "song.undislike",
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
	 * Unlikes a song
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	unlike: isLoginRequired(async function unlike(session, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => {
					songModel.findOne({ youtubeId }, next);
				},

				(song, next) => {
					if (!song) return next("No song found with that id.");
					return next(null, song);
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
						.then(res => {
							if (res.status === "error")
								return next("Unable to remove song from the 'Liked Songs' playlist.");
							return next(null, song);
						})
						.catch(err => next(err));
				},

				(song, next) => {
					SongsModule.runJob("RECALCULATE_SONG_RATINGS", { songId: song._id, youtubeId })
						.then(ratings => next(null, song, ratings))
						.catch(err => next(err));
				}
			],
			async (err, song, { likes, dislikes }) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_UNLIKE",
						`User "${session.userId}" failed to unlike song ${youtubeId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				SongsModule.runJob("UPDATE_SONG", { songId: song._id });

				CacheModule.runJob("PUB", {
					channel: "song.unlike",
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
	 * Gets song ratings
	 *
	 * @param session
	 * @param songId - the Musare song id
	 * @param cb
	 */

	getSongRatings: isLoginRequired(async function getSongRatings(session, songId, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("GET_SONG", { songId }, this)
						.then(res => next(null, res.song))
						.catch(next);
				},

				(song, next) => {
					next(null, {
						likes: song.likes,
						dislikes: song.dislikes
					});
				}
			],
			async (err, ratings) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"SONGS_GET_RATINGS",
						`User "${session.userId}" failed to get ratings for ${songId}. "${err}"`
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
	 * Gets user's own song ratings
	 *
	 * @param session
	 * @param youtubeId - the youtube id
	 * @param cb
	 */

	getOwnSongRatings: isLoginRequired(async function getOwnSongRatings(session, youtubeId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		async.waterfall(
			[
				next => songModel.findOne({ youtubeId }, next),
				(song, next) => {
					if (!song) return next("No song found with that id.");
					return next(null);
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
						"SONGS_GET_OWN_RATINGS",
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
