import async from "async";

import { isAdminRequired, isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const SongsModule = moduleManager.modules.songs;
const StationsModule = moduleManager.modules.stations;
const CacheModule = moduleManager.modules.cache;
const PlaylistsModule = moduleManager.modules.playlists;
const YouTubeModule = moduleManager.modules.youtube;
const ActivitiesModule = moduleManager.modules.activities;

CacheModule.runJob("SUB", {
	channel: "playlist.create",
	cb: playlist => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: playlist.createdBy }, this).then(sockets =>
			sockets.forEach(socket => socket.dispatch("d", { data: { playlist } }))
		);

		if (playlist.privacy === "public")
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile-${playlist.createdBy}-playlists`,
				args: ["event:playlist.created", { data: { playlist } }]
			});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.delete",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:playlist.deleted", { data: { playlistId: res.playlistId } });
			});
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `profile-${res.userId}-playlists`,
			args: ["event:playlist.deleted", { data: { playlistId: res.playlistId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.repositionSongs",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets =>
			sockets.forEach(socket =>
				socket.dispatch("event:playlist.songs.repositioned", {
					data: {
						playlistId: res.playlistId,
						songsBeingChanged: res.songsBeingChanged
					}
				})
			)
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.addSong",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:playlist.song.added", {
					data: {
						playlistId: res.playlistId,
						song: res.song
					}
				});
			});
		});

		if (res.privacy === "public")
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile-${res.userId}-playlists`,
				args: [
					"event:playlist.song.added",
					{
						data: {
							playlistId: res.playlistId,
							song: res.song
						}
					}
				]
			});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.removeSong",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:playlist.song.removed", {
					data: {
						playlistId: res.playlistId,
						youtubeId: res.youtubeId
					}
				});
			});
		});

		if (res.privacy === "public")
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile-${res.userId}-playlists`,
				args: [
					"event:playlist.song.removed",
					{
						data: {
							playlistId: res.playlistId,
							youtubeId: res.youtubeId
						}
					}
				]
			});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updateDisplayName",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:playlist.displayName.updated", {
					data: {
						playlistId: res.playlistId,
						displayName: res.displayName
					}
				});
			});
		});

		if (res.privacy === "public")
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile-${res.userId}-playlists`,
				args: [
					"event:playlist.displayName.updated",
					{
						data: {
							playlistId: res.playlistId,
							displayName: res.displayName
						}
					}
				]
			});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updatePrivacy",
	cb: res => {
		WSModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(sockets => {
			sockets.forEach(socket => {
				socket.dispatch("event:playlist.privacy.updated", {
					data: {
						playlist: res.playlist
					}
				});
			});
		});

		if (res.playlist.privacy === "public")
			return WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile-${res.userId}-playlists`,
				args: [
					"event:playlist.created",
					{
						data: {
							playlist: res.playlist
						}
					}
				]
			});

		return WSModule.runJob("EMIT_TO_ROOM", {
			room: `profile-${res.userId}-playlists`,
			args: [
				"event:playlist.deleted",
				{
					data: {
						playlistId: res.playlist._id
					}
				}
			]
		});
	}
});

export default {
	/**
	 * Gets all playlists
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	index: isAdminRequired(async function index(session, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					playlistModel.find({}).sort({ createdAt: "desc" }).exec(next);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "PLAYLISTS_INDEX", `Indexing playlists failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PLAYLISTS_INDEX", "Indexing playlists successful.");
				return cb({ status: "success", data: { playlists } });
			}
		);
	}),

	/**
	 * Searches through all playlists that can be included in a community station
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} query - the query
	 * @param {string} query - the page
	 * @param {Function} cb - gets called with the result
	 */
	searchCommunity: isLoginRequired(async function searchCommunity(session, query, page, cb) {
		async.waterfall(
			[
				next => {
					if ((!query && query !== "") || typeof query !== "string") next("Invalid query.");
					else next();
				},

				next => {
					PlaylistsModule.runJob("SEARCH", {
						query,
						includeUser: true,
						includeGenre: true,
						includeOwn: true,
						includeSongs: true,
						userId: session.userId,
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
					this.log("ERROR", "PLAYLISTS_SEARCH_COMMUNITY", `Searching playlists failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PLAYLISTS_SEARCH_COMMUNITY", "Searching playlists successful.");
				return cb({ status: "success", data });
			}
		);
	}),

	/**
	 * Searches through all playlists that can be included in an official station
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} query - the query
	 * @param {string} query - the page
	 * @param {Function} cb - gets called with the result
	 */
	searchOfficial: isAdminRequired(async function searchOfficial(session, query, page, cb) {
		async.waterfall(
			[
				next => {
					if ((!query && query !== "") || typeof query !== "string") next("Invalid query.");
					else next();
				},

				next => {
					PlaylistsModule.runJob("SEARCH", {
						query,
						includeGenre: true,
						includePrivate: true,
						includeSongs: true,
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
					this.log("ERROR", "PLAYLISTS_SEARCH_OFFICIAL", `Searching playlists failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PLAYLISTS_SEARCH_OFFICIAL", "Searching playlists successful.");
				return cb({ status: "success", data });
			}
		);
	}),

	/**
	 * Gets the first song from a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are getting the first song from
	 * @param {Function} cb - gets called with the result
	 */
	getFirstSong: isLoginRequired(function getFirstSong(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found.");
					playlist.songs.sort((a, b) => a.position - b.position);
					return next(null, playlist.songs[0]);
				}
			],
			async (err, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_GET_FIRST_SONG",
						`Getting the first song of playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_GET_FIRST_SONG",
					`Successfully got the first song of playlist "${playlistId}" for user "${session.userId}".`
				);
				return cb({
					status: "success",
					data: { song }
				});
			}
		);
	}),

	/**
	 * Gets a list of all the playlists for a specific user
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} userId - the user id in question
	 * @param {Function} cb - gets called with the result
	 */
	indexForUser: async function indexForUser(session, userId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findById(userId).select({ "preferences.orderOfPlaylists": -1 }).exec(next);
				},

				({ preferences }, next) => {
					const { orderOfPlaylists } = preferences;

					const match = {
						createdBy: userId,
						type: "user"
					};

					// if a playlist order exists
					if (orderOfPlaylists > 0) match._id = { $in: orderOfPlaylists };

					playlistModel
						.aggregate()
						.match(match)
						.addFields({
							weight: { $indexOfArray: [orderOfPlaylists, "$_id"] }
						})
						.sort({ weight: 1 })
						.exec(next);
				},

				(playlists, next) => {
					if (session.userId === userId) return next(null, playlists); // user requesting playlists is the owner of the playlists

					const filteredPlaylists = [];

					return async.each(
						playlists,
						(playlist, nextPlaylist) => {
							if (playlist.privacy === "public") filteredPlaylists.push(playlist);
							return nextPlaylist();
						},
						() => next(null, filteredPlaylists)
					);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_INDEX_FOR_USER",
						`Indexing playlists for user "${userId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "PLAYLIST_INDEX_FOR_USER", `Successfully indexed playlists for user "${userId}".`);

				return cb({
					status: "success",
					data: { playlists }
				});
			}
		);
	},

	/**
	 * Gets all playlists for the user requesting it
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {boolean} showNonModifiablePlaylists - whether or not to show non modifiable playlists e.g. liked songs
	 * @param {Function} cb - gets called with the result
	 */
	indexMyPlaylists: isLoginRequired(async function indexMyPlaylists(session, showNonModifiablePlaylists, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findById(session.userId).select({ "preferences.orderOfPlaylists": -1 }).exec(next);
				},

				({ preferences }, next) => {
					const { orderOfPlaylists } = preferences;

					const match = {
						createdBy: session.userId,
						type: "user"
					};

					// if non modifiable playlists should be shown as well
					if (!showNonModifiablePlaylists) match.isUserModifiable = true;

					// if a playlist order exists
					if (orderOfPlaylists > 0) match._id = { $in: orderOfPlaylists };

					playlistModel
						.aggregate()
						.match(match)
						.addFields({
							weight: { $indexOfArray: [orderOfPlaylists, "$_id"] }
						})
						.sort({ weight: 1 })
						.exec(next);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_INDEX_FOR_ME",
						`Indexing playlists for user "${session.userId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_INDEX_FOR_ME",
					`Successfully indexed playlists for user "${session.userId}".`
				);
				return cb({
					status: "success",
					data: { playlists }
				});
			}
		);
	}),

	/**
	 * Creates a new private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {object} data - the data for the new private playlist
	 * @param {Function} cb - gets called with the result
	 */
	create: isLoginRequired(async function create(session, data, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		const blacklist = ["liked songs", "likedsongs", "disliked songs", "dislikedsongs"];

		async.waterfall(
			[
				next => (data ? next() : cb({ status: "error", message: "Invalid data" })),

				next => {
					const { displayName, songs, privacy } = data;

					if (blacklist.indexOf(displayName.toLowerCase()) !== -1)
						return next("That playlist name is blacklisted. Please use a different name.");

					return playlistModel.create(
						{
							displayName,
							songs,
							privacy,
							createdBy: session.userId,
							createdAt: Date.now(),
							createdFor: null,
							type: "user"
						},
						next
					);
				},

				(playlist, next) => {
					userModel.updateOne(
						{ _id: session.userId },
						{ $push: { "preferences.orderOfPlaylists": playlist._id } },
						err => {
							if (err) return next(err);
							return next(null, playlist);
						}
					);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_CREATE",
						`Creating private playlist failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "playlist.create",
					value: playlist
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: playlist.createdBy,
					type: "playlist__create",
					payload: {
						message: `Created playlist <playlistId>${playlist.displayName}</playlistId>`,
						playlistId: playlist._id
					}
				});

				this.log(
					"SUCCESS",
					"PLAYLIST_CREATE",
					`Successfully created private playlist for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Successfully created playlist",
					data: {
						playlistId: playlist._id
					}
				});
			}
		);
	}),

	/**
	 * Gets a playlist from id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are getting
	 * @param {Function} cb - gets called with the result
	 */
	getPlaylist: function getPlaylist(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist) return next("Playlist not found");
					if (playlist.privacy !== "public" && playlist.createdBy !== session.userId) {
						if (session)
							// check if user requested to get a playlist is an admin
							return DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
								userModel.findOne({ _id: session.userId }, (err, user) => {
									if (user && user.role === "admin") return next(null, playlist);
									return next("User unauthorised to view playlist.");
								});
							});
						return next("User unauthorised to view playlist.");
					}

					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_GET",
						`Getting private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_GET",
					`Successfully got private playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					data: { playlist }
				});
			}
		);
	},

	/**
	 * Obtains basic metadata of a playlist in order to format an activity
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the playlist id
	 * @param {Function} cb - callback
	 */
	getPlaylistForActivity(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
						`Failed to obtain metadata of playlist ${playlistId} for activity formatting. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
					`Obtained metadata of playlist ${playlistId} for activity formatting successfully.`
				);
				return cb({
					status: "success",
					data: {
						title: playlist.displayName
					}
				});
			}
		);
	},

	/**
	 * Gets a playlist from station id
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} stationId - the id of the station we are getting
	 * @param {string} includeSongs - include songs
	 * @param {Function} cb - gets called with the result
	 */
	getPlaylistForStation: function getPlaylist(session, stationId, includeSongs, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_STATION_PLAYLIST", { stationId, includeSongs }, this)
						.then(response => next(null, response.playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist) return next("Playlist not found");
					if (playlist.privacy !== "public" && playlist.createdBy !== session.userId) {
						if (session)
							// check if user requested to get a playlist is an admin
							return DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
								userModel.findOne({ _id: session.userId }, (err, user) => {
									if (user && user.role === "admin") return next(null, playlist);
									return next("User unauthorised to view playlist.");
								});
							});
						return next("User unauthorised to view playlist.");
					}

					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_GET",
						`Getting playlist for station "${stationId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_GET",
					`Successfully got playlist for station "${stationId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					data: { playlist }
				});
			}
		);
	},

	// TODO Remove this
	/**
	 * Updates a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are updating
	 * @param {object} playlist - the new private playlist object
	 * @param {Function} cb - gets called with the result
	 */
	update: isLoginRequired(async function update(session, playlistId, playlist, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					playlistModel.updateOne(
						{ _id: playlistId, createdBy: session.userId },
						playlist,
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_UPDATE",
						`Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE",
					`Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					data: { playlist }
				});
			}
		);
	}),

	/**
	 * Shuffles songs in a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are updating
	 * @param {Function} cb - gets called with the result
	 */
	shuffle: isLoginRequired(async function shuffle(session, playlistId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					if (!playlistId) return next("No playlist id.");
					return playlistModel.findById(playlistId, next);
				},

				(playlist, next) => {
					if (!playlist.isUserModifiable) return next("Playlist cannot be shuffled.");

					return UtilsModule.runJob("SHUFFLE_SONG_POSITIONS", { array: playlist.songs }, this)
						.then(result => next(null, result.array))
						.catch(next);
				},

				(songs, next) => {
					playlistModel.updateOne({ _id: playlistId }, { $set: { songs } }, { runValidators: true }, next);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_SHUFFLE",
						`Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_SHUFFLE",
					`Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Successfully shuffled playlist.",
					data: { playlist }
				});
			}
		);
	}),

	/**
	 * Changes the order of song(s) in a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are targeting
	 * @param {Array} songsBeingChanged - the songs to be repositioned, each element contains "youtubeId" and "position" properties
	 * @param {Function} cb - gets called with the result
	 */
	repositionSongs: isLoginRequired(async function repositionSongs(session, playlistId, songsBeingChanged, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				// update playlist object with each song's new position
				next =>
					async.each(
						songsBeingChanged,
						(song, nextSong) =>
							playlistModel.updateOne(
								{ _id: playlistId, "songs.youtubeId": song.youtubeId },
								{
									$set: {
										"songs.$.position": song.position
									}
								},
								err => {
									if (err) return next(err);
									return nextSong();
								}
							),
						next
					),

				// update the cache with the new songs positioning
				next => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_REPOSITION_SONGS",
						`Repositioning songs for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REPOSITION_SONGS",
					`Successfully repositioned songs for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.repositionSongs",
					value: {
						userId: session.userId,
						playlistId,
						songsBeingChanged
					}
				});

				return cb({
					status: "success",
					message: "Order of songs successfully updated"
				});
			}
		);
	}),

	/**
	 * Moves a song to the bottom of the list in a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are moving the song to the bottom from
	 * @param {string} youtubeId - the youtube id of the song we are moving to the bottom of the list
	 * @param {Function} cb - gets called with the result
	 */
	moveSongToBottom: isLoginRequired(async function moveSongToBottom(session, playlistId, youtubeId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");
					if (!playlist.isUserModifiable) return next("Playlist cannot be modified.");

					// sort array by position
					playlist.songs.sort((a, b) => a.position - b.position);

					// find index of youtubeId
					playlist.songs.forEach((song, index) => {
						// reorder array (simulates what would be done with a drag and drop interface)
						if (song.youtubeId === youtubeId)
							playlist.songs.splice(playlist.songs.length, 0, playlist.songs.splice(index, 1)[0]);
					});

					const songsBeingChanged = [];

					playlist.songs.forEach((song, index) => {
						// check if position needs updated based on index
						if (song.position !== index + 1)
							songsBeingChanged.push({
								youtubeId: song.youtubeId,
								position: index + 1
							});
					});

					// update position property on songs that need to be changed
					return WSModule.runJob(
						"RUN_ACTION2",
						{
							session,
							namespace: "playlists",
							action: "repositionSongs",
							args: [playlistId, songsBeingChanged]
						},
						this
					)
						.then(res => {
							if (res.status === "success") return next();
							return next("Unable to reposition song in playlist.");
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_MOVE_SONG_TO_BOTTOM",
						`Moving song "${youtubeId}" to the bottom for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_MOVE_SONG_TO_BOTTOM",
					`Successfully moved song "${youtubeId}" to the bottom for private playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Order of songs successfully updated"
				});
			}
		);
	}),

	/**
	 * Adds a song to a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {boolean} isSet - is the song part of a set of songs to be added
	 * @param {string} youtubeId - the youtube id of the song we are trying to add
	 * @param {string} playlistId - the id of the playlist we are adding the song to
	 * @param {Function} cb - gets called with the result
	 */
	addSongToPlaylist: isLoginRequired(async function addSongToPlaylist(session, isSet, youtubeId, playlistId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							if (!playlist || playlist.createdBy !== session.userId)
								return next("Something went wrong when trying to get the playlist");

							return async.each(
								playlist.songs,
								(song, nextSong) => {
									if (song.youtubeId === youtubeId)
										return next("That song is already in the playlist");
									return nextSong();
								},
								err => next(err)
							);
						})
						.catch(next);
				},

				next => {
					DBModule.runJob("GET_MODEL", { modelName: "user" }, this)
						.then(UserModel => {
							UserModel.findOne(
								{ _id: session.userId },
								{ "preferences.anonymousSongRequests": 1 },
								next
							);
						})
						.catch(next);
				},

				(user, next) => {
					SongsModule.runJob(
						"ENSURE_SONG_EXISTS_BY_YOUTUBE_ID",
						{
							youtubeId,
							userId: user.preferences.anonymousSongRequests ? null : session.userId,
							automaticallyRequested: true
						},
						this
					)
						.then(response => {
							const { song } = response;
							const { _id, title, thumbnail, duration, status } = song;
							next(null, {
								_id,
								youtubeId,
								title,
								thumbnail,
								duration,
								status
							});
						})
						.catch(next);
				},
				(newSong, next) => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{ $push: { songs: newSong } },
						{ runValidators: true },
						err => {
							if (err) return next(err);
							return PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
								.then(playlist => next(null, playlist, newSong))
								.catch(next);
						}
					);
				}
			],
			async (err, playlist, newSong) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_ADD_SONG",
						`Adding song "${youtubeId}" to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_ADD_SONG",
					`Successfully added song "${youtubeId}" to private playlist "${playlistId}" for user "${session.userId}".`
				);

				if (!isSet && playlist.displayName !== "Liked Songs" && playlist.displayName !== "Disliked Songs") {
					const songName = newSong.artists
						? `${newSong.title} by ${newSong.artists.join(", ")}`
						: newSong.title;

					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "playlist__add_song",
						payload: {
							message: `Added <youtubeId>${songName}</youtubeId> to playlist <playlistId>${playlist.displayName}</playlistId>`,
							thumbnail: newSong.thumbnail,
							playlistId,
							youtubeId
						}
					});
				}

				StationsModule.runJob("GET_STATIONS_THAT_INCLUDE_OR_EXCLUDE_PLAYLIST", { playlistId })
					.then(response => {
						response.stationIds.forEach(stationId => {
							PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
						});
					})
					.catch();

				CacheModule.runJob("PUB", {
					channel: "playlist.addSong",
					value: {
						playlistId: playlist._id,
						song: newSong,
						userId: session.userId,
						privacy: playlist.privacy
					}
				});

				return cb({
					status: "success",
					message: "Song has been successfully added to the playlist",
					data: { songs: playlist.songs }
				});
			}
		);
	}),

	/**
	 * Adds a set of songs to a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {string} playlistId - the id of the playlist we are adding the set of songs to
	 * @param {boolean} musicOnly - whether to only add music to the playlist
	 * @param {Function} cb - gets called with the result
	 */
	addSetToPlaylist: isLoginRequired(function addSetToPlaylist(session, url, playlistId, musicOnly, cb) {
		let videosInPlaylistTotal = 0;
		let songsInPlaylistTotal = 0;
		let addSongsStats = null;

		const addedSongs = [];

		async.waterfall(
			[
				next => {
					YouTubeModule.runJob("GET_PLAYLIST", { url, musicOnly }, this)
						.then(res => {
							if (res.filteredSongs) {
								videosInPlaylistTotal = res.songs.length;
								songsInPlaylistTotal = res.filteredSongs.length;
							} else {
								songsInPlaylistTotal = videosInPlaylistTotal = res.songs.length;
							}
							next(null, res.songs);
						})
						.catch(err => {
							next(err);
						});
				},
				(youtubeIds, next) => {
					let successful = 0;
					let failed = 0;
					let alreadyInPlaylist = 0;

					if (youtubeIds.length === 0) next();

					async.eachLimit(
						youtubeIds,
						1,
						(youtubeId, next) => {
							WSModule.runJob(
								"RUN_ACTION2",
								{
									session,
									namespace: "playlists",
									action: "addSongToPlaylist",
									args: [true, youtubeId, playlistId]
								},
								this
							)
								.then(res => {
									if (res.status === "success") {
										successful += 1;
										addedSongs.push(youtubeId);
									} else failed += 1;
									if (res.message === "That song is already in the playlist") alreadyInPlaylist += 1;
								})
								.catch(() => {
									failed += 1;
								})
								.finally(() => next());
						},
						() => {
							addSongsStats = { successful, failed, alreadyInPlaylist };
							next(null);
						}
					);
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found.");
					if (!playlist.isUserModifiable) return next("Playlist cannot be modified.");

					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_IMPORT",
						`Importing a YouTube playlist to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "playlist__import_playlist",
					payload: {
						message: `Imported ${addSongsStats.successful} songs to playlist <playlistId>${playlist.displayName}</playlistId>`,
						playlistId
					}
				});

				this.log(
					"SUCCESS",
					"PLAYLIST_IMPORT",
					`Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${session.userId}". Videos in playlist: ${videosInPlaylistTotal}, songs in playlist: ${songsInPlaylistTotal}, songs successfully added: ${addSongsStats.successful}, songs failed: ${addSongsStats.failed}, already in playlist: ${addSongsStats.alreadyInPlaylist}.`
				);

				return cb({
					status: "success",
					message: `Playlist has been imported. ${addSongsStats.successful} were added successfully, ${addSongsStats.failed} failed (${addSongsStats.alreadyInPlaylist} were already in the playlist)`,
					data: {
						songs: playlist.songs,
						stats: {
							videosInPlaylistTotal,
							songsInPlaylistTotal
						}
					}
				});
			}
		);
	}),

	/**
	 * Removes a song from a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} youtubeId - the youtube id of the song we are removing from the private playlist
	 * @param {string} playlistId - the id of the playlist we are removing the song from
	 * @param {Function} cb - gets called with the result
	 */
	removeSongFromPlaylist: isLoginRequired(async function removeSongFromPlaylist(session, youtubeId, playlistId, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					if (!youtubeId || typeof youtubeId !== "string") return next("Invalid song id.");
					if (!playlistId) return next("Invalid playlist id.");
					return next();
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");

					// sort array by position
					playlist.songs.sort((a, b) => a.position - b.position);

					// find index of youtubeId
					playlist.songs.forEach((song, ind) => {
						// remove song from array
						if (song.youtubeId === youtubeId) playlist.songs.splice(ind, 1);
					});

					const songsBeingChanged = [];

					playlist.songs.forEach((song, index) => {
						// check if position needs updated based on index
						if (song.position !== index + 1)
							songsBeingChanged.push({
								youtubeId: song.youtubeId,
								position: index + 1
							});
					});

					// update position property on songs that need to be changed
					return WSModule.runJob(
						"RUN_ACTION2",
						{
							session,
							namespace: "playlists",
							action: "repositionSongs",
							args: [playlistId, songsBeingChanged]
						},
						this
					)
						.then(res => {
							if (res.status === "success") return next();
							return next("Unable to reposition song in playlist.");
						})
						.catch(next);
				},

				next => playlistModel.updateOne({ _id: playlistId }, { $pull: { songs: { youtubeId } } }, next),

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					StationsModule.runJob("GET_STATIONS_THAT_INCLUDE_OR_EXCLUDE_PLAYLIST", { playlistId })
						.then(response => {
							response.stationIds.forEach(stationId => {
								PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
							});
						})
						.catch();

					SongsModule.runJob("GET_SONG_FROM_YOUTUBE_ID", { youtubeId }, this)
						.then(res =>
							next(null, playlist, {
								title: res.song.title,
								thumbnail: res.song.thumbnail,
								artists: res.song.artists
							})
						)
						.catch(() => {
							YouTubeModule.runJob("GET_SONG", { youtubeId }, this)
								.then(response => next(null, playlist, response.song))
								.catch(next);
						});
				},

				(playlist, youtubeSong, next) => {
					const songName = youtubeSong.artists
						? `${youtubeSong.title} by ${youtubeSong.artists.join(", ")}`
						: youtubeSong.title;

					if (playlist.displayName !== "Liked Songs" && playlist.displayName !== "Disliked Songs") {
						ActivitiesModule.runJob("ADD_ACTIVITY", {
							userId: session.userId,
							type: "playlist__remove_song",
							payload: {
								message: `Removed <youtubeId>${songName}</youtubeId> from playlist <playlistId>${playlist.displayName}</playlistId>`,
								thumbnail: youtubeSong.thumbnail,
								playlistId,
								youtubeId
							}
						});
					}

					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_REMOVE_SONG",
						`Removing song "${youtubeId}" from private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REMOVE_SONG",
					`Successfully removed song "${youtubeId}" from private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.removeSong",
					value: {
						playlistId: playlist._id,
						youtubeId,
						userId: session.userId,
						privacy: playlist.privacy
					}
				});

				return cb({
					status: "success",
					message: "Song has been successfully removed from playlist",
					data: { songs: playlist.songs }
				});
			}
		);
	}),

	/**
	 * Updates the displayName of a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are updating the displayName for
	 * @param {Function} cb - gets called with the result
	 */
	updateDisplayName: isLoginRequired(async function updateDisplayName(session, playlistId, displayName, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist.isUserModifiable) return next("Playlist cannot be modified.");
					return next(null);
				},

				next => {
					playlistModel.updateOne(
						{ _id: playlistId, createdBy: session.userId },
						{ $set: { displayName } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_UPDATE_DISPLAY_NAME",
						`Updating display name to "${displayName}" for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE_DISPLAY_NAME",
					`Successfully updated display name to "${displayName}" for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.updateDisplayName",
					value: {
						playlistId,
						displayName,
						userId: session.userId,
						privacy: playlist.privacy
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "playlist__edit_display_name",
					payload: {
						message: `Changed display name of playlist <playlistId>${displayName}</playlistId>`,
						playlistId
					}
				});

				return cb({
					status: "success",
					message: "Playlist has been successfully updated"
				});
			}
		);
	}),

	/**
	 * Removes a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {Function} cb - gets called with the result
	 */
	remove: isLoginRequired(async function remove(session, playlistId, cb) {
		// const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist.isUserModifiable) return next("Playlist cannot be removed.");
					return next(null, playlist);
				},

				(playlist, next) => {
					userModel.updateOne(
						{ _id: playlist.createdBy },
						{ $pull: { "preferences.orderOfPlaylists": playlist._id } },
						err => next(err, playlist)
					);
				},

				(playlist, next) => {
					PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId }, this)
						.then(() => next(null, playlist))
						.catch(next);
				}

				// (playlist, next) => {
				// 	stationModel.find({ privatePlaylist: playlistId }, (err, res) => {
				// 		next(err, playlist, res);
				// 	});
				// },

				// (playlist, stations, next) => {
				// 	async.each(
				// 		stations,
				// 		(station, next) => {
				// 			async.waterfall(
				// 				[
				// 					next => {
				// 						stationModel.updateOne(
				// 							{ _id: station._id },
				// 							{ $set: { privatePlaylist: null } },
				// 							{ runValidators: true },
				// 							next
				// 						);
				// 					},

				// 					(res, next) => {
				// 						if (!station.partyMode) {
				// 							moduleManager.modules.stations
				// 								.runJob("UPDATE_STATION", { stationId: station._id }, this)
				// 								.then(station => next(null, station))
				// 								.catch(next);
				// 							CacheModule.runJob("PUB", {
				// 								channel: "privatePlaylist.selected",
				// 								value: {
				// 									playlistId: null,
				// 									stationId: station._id
				// 								}
				// 							});
				// 						} else next();
				// 					}
				// 				],

				// 				() => next()
				// 			);
				// 		},
				// 		() => next(null, playlist)
				// 	);
				// }
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_REMOVE",
						`Removing private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REMOVE",
					`Successfully removed private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.delete",
					value: {
						userId: session.userId,
						playlistId
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: playlist.createdBy,
					type: "playlist__remove",
					payload: {
						message: `Removed playlist ${playlist.displayName}`
					}
				});

				ActivitiesModule.runJob("REMOVE_ACTIVITY_REFERENCES", { type: "playlistId", playlistId });

				return cb({
					status: "success",
					message: "Playlist successfully removed"
				});
			}
		);
	}),

	/**
	 * Updates the privacy of a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are updating the privacy for
	 * @param {string} privacy - what the new privacy of the playlist should be e.g. public
	 * @param {Function} cb - gets called with the result
	 */
	updatePrivacy: isLoginRequired(async function updatePrivacy(session, playlistId, privacy, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					playlistModel.updateOne(
						{ _id: playlistId, createdBy: session.userId },
						{ $set: { privacy } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_UPDATE_PRIVACY",
						`Updating privacy to "${privacy}" for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE_PRIVACY",
					`Successfully updated privacy to "${privacy}" for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.updatePrivacy",
					value: {
						userId: session.userId,
						playlist
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "playlist__edit_privacy",
					payload: {
						message: `Changed privacy of playlist <playlistId>${playlist.displayName}</playlistId> to ${privacy}`,
						playlistId
					}
				});

				return cb({
					status: "success",
					message: "Playlist has been successfully updated"
				});
			}
		);
	}),

	/**
	 * Deletes all orphaned station playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	deleteOrphanedStationPlaylists: isAdminRequired(async function index(session, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("DELETE_ORPHANED_STATION_PLAYLISTS", {}, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLISTS_DELETE_ORPHANED_STATION_PLAYLISTS",
						`Deleting orphaned station playlists failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_DELETE_ORPHANED_STATION_PLAYLISTS",
					"Deleting orphaned station playlists successful."
				);
				return cb({ status: "success", message: "Successfully deleted orphaned station playlists." });
			}
		);
	}),

	/**
	 * Deletes all orphaned genre playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	deleteOrphanedGenrePlaylists: isAdminRequired(async function index(session, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("DELETE_ORPHANED_GENRE_PLAYLISTS", {}, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLISTS_DELETE_ORPHANED_GENRE_PLAYLISTS",
						`Deleting orphaned genre playlists failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_DELETE_ORPHANED_GENRE_PLAYLISTS",
					"Deleting orphaned genre playlists successful."
				);
				return cb({ status: "success", message: "Successfully deleted orphaned genre playlists." });
			}
		);
	}),

	/**
	 * Requests orpahned playlist songs
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	requestOrphanedPlaylistSongs: isAdminRequired(async function index(session, cb) {
		async.waterfall(
			[
				next => {
					SongsModule.runJob("REQUEST_ORPHANED_PLAYLIST_SONGS", {}, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"REQUEST_ORPHANED_PLAYLIST_SONGS",
						`Requesting orphaned playlist songs failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"REQUEST_ORPHANED_PLAYLIST_SONGS",
					"Requesting orphaned playlist songs was successful."
				);
				return cb({ status: "success", message: "Successfully requested orphaned playlist songs." });
			}
		);
	}),

	/**
	 * Clears and refills a station playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are clearing and refilling
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillStationPlaylist: isAdminRequired(async function index(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					if (!playlistId) next("Please specify a playlist id");
					else {
						PlaylistsModule.runJob("CLEAR_AND_REFILL_STATION_PLAYLIST", { playlistId }, this)
							.then(() => {
								next();
							})
							.catch(err => {
								next(err);
							});
					}
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_CLEAR_AND_REFILL_STATION_PLAYLIST",
						`Clearing and refilling station playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CLEAR_AND_REFILL_STATION_PLAYLIST",
					`Successfully cleared and refilled station playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Playlist has been successfully cleared and refilled"
				});
			}
		);
	}),

	/**
	 * Clears and refills a genre playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are clearing and refilling
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillGenrePlaylist: isAdminRequired(async function index(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					if (!playlistId) next("Please specify a playlist id");
					else {
						PlaylistsModule.runJob("CLEAR_AND_REFILL_GENRE_PLAYLIST", { playlistId }, this)
							.then(() => {
								next();
							})
							.catch(err => {
								next(err);
							});
					}
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_CLEAR_AND_REFILL_GENRE_PLAYLIST",
						`Clearing and refilling genre playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CLEAR_AND_REFILL_GENRE_PLAYLIST",
					`Successfully cleared and refilled genre playlist "${playlistId}" for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Playlist has been successfully cleared and refilled"
				});
			}
		);
	}),

	/**
	 * Clears and refills all station playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillAllStationPlaylists: isAdminRequired(async function index(session, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_ALL_STATION_PLAYLISTS", {}, this)
						.then(response => {
							next(null, response.playlists);
						})
						.catch(err => {
							next(err);
						});
				},

				(playlists, next) => {
					async.eachLimit(
						playlists,
						1,
						(playlist, next) => {
							PlaylistsModule.runJob(
								"CLEAR_AND_REFILL_STATION_PLAYLIST",
								{ playlistId: playlist._id },
								this
							)
								.then(() => {
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						next
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_CLEAR_AND_REFILL_ALL_STATION_PLAYLISTS",
						`Clearing and refilling all station playlists failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CLEAR_AND_REFILL_ALL_STATION_PLAYLISTS",
					`Successfully cleared and refilled all station playlists for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Playlists have been successfully cleared and refilled"
				});
			}
		);
	}),

	/**
	 * Clears and refills all genre playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillAllGenrePlaylists: isAdminRequired(async function index(session, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_ALL_GENRE_PLAYLISTS", {}, this)
						.then(response => {
							next(null, response.playlists);
						})
						.catch(err => {
							next(err);
						});
				},

				(playlists, next) => {
					async.eachLimit(
						playlists,
						1,
						(playlist, next) => {
							PlaylistsModule.runJob(
								"CLEAR_AND_REFILL_GENRE_PLAYLIST",
								{ playlistId: playlist._id },
								this
							)
								.then(() => {
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						next
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"PLAYLIST_CLEAR_AND_REFILL_ALL_GENRE_PLAYLISTS",
						`Clearing and refilling all genre playlists failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CLEAR_AND_REFILL_ALL_GENRE_PLAYLISTS",
					`Successfully cleared and refilled all genre playlists for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Playlists have been successfully cleared and refilled"
				});
			}
		);
	})
};
