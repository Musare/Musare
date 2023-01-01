import async from "async";
import config from "config";

import isLoginRequired from "../hooks/loginRequired";
import { hasPermission, useHasPermission } from "../hooks/hasPermission";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const SongsModule = moduleManager.modules.songs;
const CacheModule = moduleManager.modules.cache;
const PlaylistsModule = moduleManager.modules.playlists;
const YouTubeModule = moduleManager.modules.youtube;
const ActivitiesModule = moduleManager.modules.activities;
const MediaModule = moduleManager.modules.media;

CacheModule.runJob("SUB", {
	channel: "playlist.create",
	cb: playlist => {
		if (playlist.createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: playlist.createdBy }, this).then(sockets =>
				sockets.forEach(socket => socket.dispatch("event:playlist.created", { data: { playlist } }))
			);

			if (playlist.privacy === "public")
				WSModule.runJob("EMIT_TO_ROOM", {
					room: `profile.${playlist.createdBy}.playlists`,
					args: ["event:playlist.created", { data: { playlist } }]
				});
		}

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: ["event:admin.playlist.created", { data: { playlist } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.delete",
	cb: res => {
		if (res.createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: res.createdBy }, this).then(sockets => {
				sockets.forEach(socket => {
					socket.dispatch("event:playlist.deleted", { data: { playlistId: res.playlistId } });
				});
			});

			WSModule.runJob("EMIT_TO_ROOM", {
				room: `profile.${res.createdBy}.playlists`,
				args: ["event:playlist.deleted", { data: { playlistId: res.playlistId } }]
			});
		}

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: ["event:admin.playlist.deleted", { data: { playlistId: res.playlistId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.repositionSong",
	cb: res => {
		const { createdBy, playlistId, song } = res;

		if (createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: createdBy }, this).then(sockets =>
				sockets.forEach(socket =>
					socket.dispatch("event:playlist.song.repositioned", {
						data: { playlistId, song }
					})
				)
			);
		}
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.addSong",
	cb: res => {
		if (res.createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: res.createdBy }, this).then(sockets => {
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
					room: `profile.${res.createdBy}.playlists`,
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

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: ["event:admin.playlist.song.added", { data: { playlistId: res.playlistId, song: res.song } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.removeSong",
	cb: res => {
		if (res.createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: res.createdBy }, this).then(sockets => {
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
					room: `profile.${res.createdBy}.playlists`,
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

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: [
				"event:admin.playlist.song.removed",
				{ data: { playlistId: res.playlistId, youtubeId: res.youtubeId } }
			]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updateDisplayName",
	cb: res => {
		if (res.createdBy !== "Musare") {
			WSModule.runJob("SOCKETS_FROM_USER", { userId: res.createdBy }, this).then(sockets => {
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
					room: `profile.${res.createdBy}.playlists`,
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

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: [
				"event:admin.playlist.displayName.updated",
				{ data: { playlistId: res.playlistId, displayName: res.displayName } }
			]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updatePrivacy",
	cb: res => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.playlists",
			args: [
				"event:admin.playlist.privacy.updated",
				{ data: { playlistId: res.playlist._id, privacy: res.playlist.privacy } }
			]
		});

		if (res.createdBy !== "Musare") {
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
					room: `profile.${res.userId}.playlists`,
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
				room: `profile.${res.userId}.playlists`,
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
		return null;
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updated",
	cb: async data => {
		const playlistModel = await DBModule.runJob("GET_MODEL", {
			modelName: "playlist"
		});

		playlistModel.findOne(
			{ _id: data.playlistId },
			["_id", "displayName", "type", "privacy", "songs", "createdBy", "createdAt", "createdFor"],
			(err, playlist) => {
				const newPlaylist = {
					...playlist._doc,
					songsCount: playlist.songs.length,
					songsLength: playlist.songs.reduce(
						(previous, current) => ({
							duration: previous.duration + current.duration
						}),
						{ duration: 0 }
					).duration
				};
				delete newPlaylist.songs;
				WSModule.runJob("EMIT_TO_ROOMS", {
					rooms: ["admin.playlists"],
					args: ["event:admin.playlist.updated", { data: { playlist: newPlaylist } }]
				});
			}
		);
	}
});

export default {
	/**
	 * Gets playlists, used in the admin playlists page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each playlist
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: useHasPermission(
		"admin.view.playlists",
		async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
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
								modelName: "playlist",
								blacklistedProperties: [],
								specialProperties: {
									totalLength: [
										{
											$addFields: {
												totalLength: { $sum: "$songs.duration" }
											}
										}
									],
									songsCount: [
										{
											$addFields: {
												songsCount: { $size: "$songs" }
											}
										}
									],
									createdBy: [
										{
											$addFields: {
												createdByOID: {
													$convert: {
														input: "$createdBy",
														to: "objectId",
														onError: "unknown",
														onNull: "unknown"
													}
												}
											}
										},
										{
											$lookup: {
												from: "users",
												localField: "createdByOID",
												foreignField: "_id",
												as: "createdByUser"
											}
										},
										{
											$unwind: {
												path: "$createdByUser",
												preserveNullAndEmptyArrays: true
											}
										},
										{
											$addFields: {
												createdByUsername: {
													$cond: [
														{ $eq: ["$createdBy", "Musare"] },
														"Musare",
														{ $ifNull: ["$createdByUser.username", "unknown"] }
													]
												}
											}
										},
										{
											$project: {
												createdByOID: 0,
												createdByUser: 0
											}
										}
									]
								},
								specialQueries: {
									createdBy: newQuery => ({
										$or: [newQuery, { createdByUsername: newQuery.createdBy }]
									})
								}
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
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log("ERROR", "PLAYLISTS_GET_DATA", `Failed to get data from playlists. "${err}"`);
						return cb({ status: "error", message: err });
					}
					this.log("SUCCESS", "PLAYLISTS_GET_DATA", `Got data from playlists successfully.`);
					return cb({ status: "success", message: "Successfully got data from playlists.", data: response });
				}
			);
		}
	),

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
						includeAdmin: true,
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
	searchOfficial: useHasPermission("playlists.get", async function searchOfficial(session, query, page, cb) {
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
						includeAdmin: true,
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
	 * Searches through all admin playlists
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} query - the query
	 * @param {string} query - the page
	 * @param {Function} cb - gets called with the result
	 */
	searchAdmin: useHasPermission("playlists.get", async function searchAdmin(session, query, page, cb) {
		async.waterfall(
			[
				next => {
					if ((!query && query !== "") || typeof query !== "string") next("Invalid query.");
					else next();
				},

				next => {
					PlaylistsModule.runJob("SEARCH", {
						query,
						includePrivate: true,
						includeSongs: true,
						includeAdmin: true,
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
					this.log("ERROR", "PLAYLISTS_SEARCH_ADMIN", `Searching playlists failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PLAYLISTS_SEARCH_ADMIN", "Searching playlists successful.");
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

				(user, next) => {
					if (!user) next("User not found");
					else {
						const { preferences } = user;
						const { orderOfPlaylists } = preferences;

						const match = {
							createdBy: userId,
							type: { $in: ["user", "user-liked", "user-disliked"] }
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
					}
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
	 * @param {Function} cb - gets called with the result
	 */
	indexMyPlaylists: isLoginRequired(async function indexMyPlaylists(session, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.findById(session.userId).select({ "preferences.orderOfPlaylists": -1 }).exec(next);
				},

				(user, next) => {
					if (!user) next("User not found");
					else {
						const { preferences } = user;
						const { orderOfPlaylists } = preferences;

						const match = {
							createdBy: session.userId,
							type: { $in: ["user", "user-liked", "user-disliked"] }
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
					}
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
	 * Gets all playlists playlists
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {Function} cb - gets called with the result
	 */
	indexFeaturedPlaylists: isLoginRequired(async function indexMyPlaylists(session, cb) {
		async.waterfall(
			[
				next => {
					const featuredPlaylistIds = config.get("featuredPlaylists");
					if (featuredPlaylistIds.length === 0) next(true, []);
					else next(null, featuredPlaylistIds);
				},

				(featuredPlaylistIds, next) => {
					const featuredPlaylists = [];
					async.eachLimit(
						featuredPlaylistIds,
						1,
						(playlistId, next) => {
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
								.then(playlist => {
									if (playlist.privacy === "public") featuredPlaylists.push(playlist);
									next();
								})
								.catch(next);
						},
						err => {
							next(err, featuredPlaylists);
						}
					);
				}
			],
			async (err, playlists) => {
				if (err && err !== true) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "PLAYLIST_INDEX_FEATURED", `Indexing featured playlists failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "PLAYLIST_INDEX_FEATURED", `Successfully indexed featured playlists.`);
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
					const { displayName, songs, privacy, admin } = data;

					if (blacklist.indexOf(displayName.toLowerCase()) !== -1)
						return next("That playlist name is blacklisted. Please use a different name.");

					return playlistModel.create(
						{
							displayName,
							songs,
							privacy,
							createdBy: admin ? "Musare" : session.userId,
							createdAt: Date.now(),
							createdFor: null,
							type: admin ? "admin" : "user"
						},
						next
					);
				},

				(playlist, next) => {
					if (data.admin) next(null, playlist);
					else
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
				let type = "unknown";
				if (data && data.admin) type = "admin";
				else if (data && !data.admin) type = "user";

				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_CREATE",
						`Creating ${type} playlist failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "playlist.create",
					value: playlist
				});

				if (!data.admin)
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
					`Successfully created ${type} playlist for user "${session.userId}".`
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
					if (playlist.privacy !== "public" && playlist.createdBy !== session.userId)
						return hasPermission("playlists.get", session)
							.then(() => next(null, playlist))
							.catch(() => next("User unauthorised to view playlist."));
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
					if (playlist.privacy !== "public")
						return hasPermission("stations.view", session, stationId)
							.then(() => next(null, playlist))
							.catch(() => next("User unauthorised to view playlist."));
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
					return next();
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							if (!playlist || playlist.createdBy !== session.userId)
								return next("Something went wrong when trying to get the playlist");

							return next(null, playlist);
						})
						.catch(next);
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
	 * Changes the order (position) of a song in a playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are targeting
	 * @param {object} song - the song to be repositioned
	 * @param {string} song.youtubeId - the youtube id of the song being repositioned
	 * @param {string} song.newIndex - the new position of the song in the playlist
	 * @param {...any} song.args - any other elements that would be included with a song item in a playlist
	 * @param {Function} cb - gets called with the result
	 */
	repositionSong: isLoginRequired(async function repositionSong(session, playlistId, song, cb) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					if (!playlistId) return next("Please provide a playlist.");
					if (!song || !song.youtubeId) return next("You must provide a song to reposition.");
					return next();
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							if (!playlist) return next("Playlist not found.");
							if (playlist.createdBy !== session.userId)
								return hasPermission("playlists.songs.reposition", session)
									.then(() => next())
									.catch(() => next("Invalid permissions."));
							return next();
						})
						.catch(next);
				},

				// remove song from playlist
				next => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{ $pull: { songs: { youtubeId: song.youtubeId } } },
						next
					);
				},

				// add song back to playlist (in new position)
				(res, next) => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{ $push: { songs: { $each: [song], $position: song.newIndex } } },
						err => next(err)
					);
				},

				// update the cache with the new songs positioning
				next => {
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
						"PLAYLIST_REPOSITION_SONG",
						`Repositioning song ${song.youtubeId}  for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);

					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REPOSITION_SONG",
					`Successfully repositioned song ${song.youtubeId} for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.repositionSong",
					value: {
						createdBy: playlist.createdBy,
						playlistId,
						song
					}
				});

				return cb({
					status: "success",
					message: "Successfully repositioned song"
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
							if (!playlist) return next("Playlist not found.");
							if (playlist.createdBy !== session.userId)
								return hasPermission("playlists.songs.add", session)
									.then(() => next(null, playlist))
									.catch(() => next("Invalid permissions."));
							return next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (playlist.type === "user-liked" || playlist.type === "user-disliked") {
						const oppositeType = playlist.type === "user-liked" ? "user-disliked" : "user-liked";
						const oppositePlaylistName = oppositeType === "user-liked" ? "Liked Songs" : "Disliked Songs";
						playlistModel.count(
							{ type: oppositeType, createdBy: session.userId, "songs.youtubeId": youtubeId },
							(err, results) => {
								if (err) next(err);
								else if (results > 0)
									next(
										`That song is already in your ${oppositePlaylistName} playlist. A song cannot be in both the Liked Songs playlist and the Disliked Songs playlist at the same time.`
									);
								else next();
							}
						);
					} else next();
				},

				next => {
					PlaylistsModule.runJob("ADD_SONG_TO_PLAYLIST", { playlistId, youtubeId }, this)
						.then(res => {
							const { playlist, song, ratings } = res;
							next(null, playlist, song, ratings);
						})
						.catch(next);
				}
			],
			async (err, playlist, newSong, ratings) => {
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

				if (!isSet && playlist.type === "user" && playlist.privacy === "public") {
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

				CacheModule.runJob("PUB", {
					channel: "playlist.addSong",
					value: {
						playlistId: playlist._id,
						song: newSong,
						createdBy: playlist.createdBy,
						privacy: playlist.privacy
					}
				});

				CacheModule.runJob("PUB", {
					channel: "playlist.updated",
					value: { playlistId }
				});

				if (ratings && (playlist.type === "user-liked" || playlist.type === "user-disliked")) {
					const { _id, youtubeId, title, artists, thumbnail } = newSong;
					const { likes, dislikes } = ratings;

					if (_id) SongsModule.runJob("UPDATE_SONG", { songId: _id });

					if (playlist.type === "user-liked") {
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
								message: `Liked song <youtubeId>${title} by ${artists.join(", ")}</youtubeId>`,
								youtubeId,
								thumbnail
							}
						});
					} else {
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
								message: `Disliked song <youtubeId>${title} by ${artists.join(", ")}</youtubeId>`,
								youtubeId,
								thumbnail
							}
						});
					}
				}

				return cb({
					status: "success",
					message: "Song has been successfully added to the playlist",
					data: { songs: playlist.songs }
				});
			}
		);
	}),

	/**
	 * Adds songs to a playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are adding the songs to
	 * @param {Array} youtubeIds - the YouTube ids of the songs we are trying to add
	 * @param {Function} cb - gets called with the result
	 */
	addSongsToPlaylist: useHasPermission(
		"playlists.songs.add",
		async function addSongsToPlaylist(session, playlistId, youtubeIds, cb) {
			const successful = [];
			const existing = [];
			const failed = {};
			const errors = {};
			const lastYoutubeId = "none";

			const addError = message => {
				if (!errors[message]) errors[message] = 1;
				else errors[message] += 1;
			};

			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Bulk add songs to playlist",
				message: "Adding songs to playlist.",
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
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								if (!playlist) return next("Playlist not found.");
								return next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (playlist.type !== "admin") return next("Playlist must be of type admin.");
						return next();
					},

					next => {
						async.eachLimit(
							youtubeIds,
							1,
							(youtubeId, next) => {
								this.publishProgress({ status: "update", message: `Adding song "${youtubeId}"` });
								PlaylistsModule.runJob("ADD_SONG_TO_PLAYLIST", { playlistId, youtubeId }, this)
									.then(() => {
										successful.push(youtubeId);
										next();
									})
									.catch(async err => {
										err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
										if (err === "That song is already in the playlist.") {
											existing.push(youtubeId);
											next();
										} else {
											addError(err);
											failed[youtubeId] = err;
											next();
										}
									});
							},
							err => {
								if (err) next(err);
								else next();
							}
						);
					},

					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								if (!playlist) return next("Playlist not found.");
								return next(null, playlist);
							})
							.catch(next);
					}
				],
				async (err, playlist) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"PLAYLIST_ADD_SONGS",
							`Adding songs to playlist "${playlistId}" failed for user "${
								session.userId
							}". "${err}". Stats: successful:${successful.length}, existing:${existing.length}, failed:${
								Object.keys(failed).length
							}, last youtubeId:${lastYoutubeId}, youtubeIds length:${
								youtubeIds ? youtubeIds.length : null
							}`
						);
						return cb({
							status: "error",
							message: err,
							data: {
								stats: {
									successful,
									existing,
									failed,
									errors
								}
							}
						});
					}

					this.log(
						"SUCCESS",
						"PLAYLIST_ADD_SONGS",
						`Successfully added songs to playlist "${playlistId}" for user "${
							session.userId
						}". Stats: successful:${successful.length}, existing:${existing.length}, failed:${
							Object.keys(failed).length
						}, youtubeIds length:${youtubeIds ? youtubeIds.length : null}`
					);

					CacheModule.runJob("PUB", {
						channel: "playlist.updated",
						value: { playlistId }
					});

					const message = `Done adding songs. Succesful: ${successful.length}, failed: ${
						Object.keys(failed).length
					}, existing: ${existing.length}.`;

					this.publishProgress({
						status: "success",
						message
					});

					return cb({
						status: "success",
						message,
						data: {
							songs: playlist.songs,
							stats: {
								successful,
								existing,
								failed,
								errors
							}
						}
					});
				}
			);
		}
	),

	/**
	 * Removes songs from a playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are removing the songs from
	 * @param {Array} youtubeIds - the YouTube ids of the songs we are trying to remove
	 * @param {Function} cb - gets called with the result
	 */
	removeSongsFromPlaylist: useHasPermission(
		"playlists.songs.remove",
		async function removeSongsFromPlaylist(session, playlistId, youtubeIds, cb) {
			const successful = [];
			const notInPlaylist = [];
			const failed = {};
			const errors = {};
			const lastYoutubeId = "none";

			const addError = message => {
				if (!errors[message]) errors[message] = 1;
				else errors[message] += 1;
			};

			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Bulk remove songs from playlist",
				message: "Removing songs from playlist.",
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
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								if (!playlist) return next("Playlist not found.");
								return next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (playlist.type !== "admin") return next("Playlist must be of type admin.");
						return next();
					},

					next => {
						async.eachLimit(
							youtubeIds,
							1,
							(youtubeId, next) => {
								this.publishProgress({ status: "update", message: `Removing song "${youtubeId}"` });
								PlaylistsModule.runJob("REMOVE_FROM_PLAYLIST", { playlistId, youtubeId }, this)
									.then(() => {
										successful.push(youtubeId);
										next();
									})
									.catch(async err => {
										err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
										if (err === "That song is not currently in the playlist.") {
											notInPlaylist.push(youtubeId);
											next();
										} else {
											addError(err);
											failed[youtubeId] = err;
											next();
										}
									});
							},
							err => {
								if (err) next(err);
								else next();
							}
						);
					},

					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								if (!playlist) return next("Playlist not found.");
								return next(null, playlist);
							})
							.catch(next);
					}
				],
				async (err, playlist) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						this.log(
							"ERROR",
							"PLAYLIST_REMOVE_SONGS",
							`Removing songs from playlist "${playlistId}" failed for user "${
								session.userId
							}". "${err}". Stats: successful:${successful.length}, notInPlaylist:${
								notInPlaylist.length
							}, failed:${
								Object.keys(failed).length
							}, last youtubeId:${lastYoutubeId}, youtubeIds length:${
								youtubeIds ? youtubeIds.length : null
							}`
						);
						return cb({
							status: "error",
							message: err,
							data: {
								stats: {
									successful,
									notInPlaylist,
									failed,
									errors
								}
							}
						});
					}

					this.log(
						"SUCCESS",
						"PLAYLIST_REMOVE_SONGS",
						`Successfully removed songs from playlist "${playlistId}" for user "${
							session.userId
						}". Stats: successful:${successful.length}, notInPlaylist:${notInPlaylist.length}, failed:${
							Object.keys(failed).length
						}, youtubeIds length:${youtubeIds ? youtubeIds.length : null}`
					);

					CacheModule.runJob("PUB", {
						channel: "playlist.updated",
						value: { playlistId }
					});

					const message = `Done removing songs. Succesful: ${successful.length}, failed: ${
						Object.keys(failed).length
					}, not in playlist: ${notInPlaylist.length}.`;

					this.publishProgress({
						status: "success",
						message
					});

					return cb({
						status: "success",
						message,
						data: {
							songs: playlist.songs,
							stats: {
								successful,
								notInPlaylist,
								failed,
								errors
							}
						}
					});
				}
			);
		}
	),

	/**
	 * Adds a set of songs to a private playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {string} playlistId - the id of the playlist we are adding the set of songs to
	 * @param {boolean} musicOnly - whether to only add music to the playlist
	 * @param {Function} cb - gets called with the result
	 */
	addSetToPlaylist: isLoginRequired(async function addSetToPlaylist(session, url, playlistId, musicOnly, cb) {
		let videosInPlaylistTotal = 0;
		let songsInPlaylistTotal = 0;
		let addSongsStats = null;

		const addedSongs = [];

		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Import YouTube playlist",
			message: "Importing YouTube playlist.",
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
					DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
						userModel.findOne({ _id: session.userId }, (err, user) => {
							if (user && user.role === "admin") return next(null, true);
							return next(null, false);
						});
					});
				},

				(isAdmin, next) => {
					this.publishProgress({ status: "update", message: `Importing YouTube playlist (stage 1)` });
					const playlistRegex = /[\\?&]list=([^&#]*)/;
					const channelRegex =
						/\.[\w]+\/(?:(?:channel\/(UC[0-9A-Za-z_-]{21}[AQgw]))|(?:user\/?([\w-]+))|(?:c\/?([\w-]+))|(?:\/?([\w-]+)))/;

					if (playlistRegex.exec(url) || channelRegex.exec(url))
						YouTubeModule.runJob(
							playlistRegex.exec(url) ? "GET_PLAYLIST" : "GET_CHANNEL",
							{
								url,
								musicOnly,
								disableSearch: !isAdmin
							},
							this
						)
							.then(res => {
								if (res.filteredSongs) {
									videosInPlaylistTotal = res.songs.length;
									songsInPlaylistTotal = res.filteredSongs.length;
								} else {
									songsInPlaylistTotal = videosInPlaylistTotal = res.songs.length;
								}
								next(null, res.songs);
							})
							.catch(next);
					else next("Invalid YouTube URL.");
				},
				(youtubeIds, next) => {
					this.publishProgress({ status: "update", message: `Importing YouTube playlist (stage 2)` });
					let successful = 0;
					let failed = 0;
					let alreadyInPlaylist = 0;
					let alreadyInLikedPlaylist = 0;
					let alreadyInDislikedPlaylist = 0;

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
									else if (
										res.message ===
										"That song is already in your Liked Songs playlist. " +
											"A song cannot be in both the Liked Songs playlist" +
											" and the Disliked Songs playlist at the same time."
									)
										alreadyInLikedPlaylist += 1;
									else if (
										res.message ===
										"That song is already in your Disliked Songs playlist. " +
											"A song cannot be in both the Liked Songs playlist " +
											"and the Disliked Songs playlist at the same time."
									)
										alreadyInDislikedPlaylist += 1;
								})
								.catch(() => {
									failed += 1;
								})
								.finally(() => next());
						},
						() => {
							addSongsStats = {
								successful,
								failed,
								alreadyInPlaylist,
								alreadyInLikedPlaylist,
								alreadyInDislikedPlaylist
							};
							next(null);
						}
					);
				},

				next => {
					this.publishProgress({ status: "update", message: `Importing YouTube playlist (stage 3)` });
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					this.publishProgress({ status: "update", message: `Importing YouTube playlist (stage 4)` });
					if (!playlist) return next("Playlist not found.");
					if (playlist.createdBy !== session.userId)
						return hasPermission("playlists.songs.add", session)
							.then(() => next(null, playlist))
							.catch(() => next("Invalid permissions."));
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
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				}

				if (playlist.privacy === "public")
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
					`Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${session.userId}". Videos in playlist: ${videosInPlaylistTotal}, songs in playlist: ${songsInPlaylistTotal}, songs successfully added: ${addSongsStats.successful}, songs failed: ${addSongsStats.failed}, already in playlist: ${addSongsStats.alreadyInPlaylist}, already in liked ${addSongsStats.alreadyInLikedPlaylist}, already in disliked ${addSongsStats.alreadyInDislikedPlaylist}.`
				);
				this.publishProgress({
					status: "success",
					message: `Playlist has been imported. ${addSongsStats.successful} were added successfully, ${addSongsStats.failed} failed (${addSongsStats.alreadyInPlaylist} were already in the playlist)`
				});
				return cb({
					status: "success",
					message: `Playlist has been imported. ${addSongsStats.successful} were added successfully, ${addSongsStats.failed} failed (${addSongsStats.alreadyInPlaylist} were already in the playlist)`,
					data: {
						songs: playlist.songs,
						stats: {
							videosInPlaylistTotal,
							songsInPlaylistTotal,
							alreadyInLikedPlaylist: addSongsStats.alreadyInLikedPlaylist,
							alreadyInDislikedPlaylist: addSongsStats.alreadyInDislikedPlaylist
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
		async.waterfall(
			[
				next => {
					if (!youtubeId || typeof youtubeId !== "string") return next("Invalid song id.");
					if (!playlistId || typeof youtubeId !== "string") return next("Invalid playlist id.");
					return next();
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							if (!playlist) return next("Playlist not found.");
							if (playlist.createdBy !== session.userId)
								return hasPermission("playlists.songs.remove", session)
									.then(() => next(null, playlist))
									.catch(() => next("Invalid permissions."));
							return next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					MediaModule.runJob("GET_MEDIA", { youtubeId }, this)
						.then(res =>
							next(null, playlist, {
								_id: res.song._id,
								title: res.song.title,
								thumbnail: res.song.thumbnail,
								artists: res.song.artists,
								youtubeId: res.song.youtubeId
							})
						)
						.catch(next);
				},

				(playlist, newSong, next) => {
					PlaylistsModule.runJob("REMOVE_FROM_PLAYLIST", { playlistId, youtubeId }, this)
						.then(res => {
							const { ratings } = res;
							next(null, playlist, newSong, ratings);
						})
						.catch(next);
				},

				(playlist, newSong, ratings, next) => {
					const { _id, title, artists, thumbnail } = newSong;
					const songName = artists ? `${title} by ${artists.join(", ")}` : title;

					if (playlist.type === "user" && playlist.privacy === "public") {
						ActivitiesModule.runJob("ADD_ACTIVITY", {
							userId: session.userId,
							type: "playlist__remove_song",
							payload: {
								message: `Removed <youtubeId>${songName}</youtubeId> from playlist <playlistId>${playlist.displayName}</playlistId>`,
								thumbnail,
								playlistId,
								youtubeId: newSong.youtubeId
							}
						});
					}

					if (ratings && (playlist.type === "user-liked" || playlist.type === "user-disliked")) {
						const { likes, dislikes } = ratings;

						if (_id) SongsModule.runJob("UPDATE_SONG", { songId: _id });

						if (playlist.type === "user-liked") {
							CacheModule.runJob("PUB", {
								channel: "ratings.unlike",
								value: JSON.stringify({
									youtubeId: newSong.youtubeId,
									userId: session.userId,
									likes,
									dislikes
								})
							});

							ActivitiesModule.runJob("ADD_ACTIVITY", {
								userId: session.userId,
								type: "song__unlike",
								payload: {
									message: `Removed <youtubeId>${title} by ${artists.join(
										", "
									)}</youtubeId> from your Liked Songs`,
									youtubeId: newSong.youtubeId,
									thumbnail
								}
							});
						} else {
							CacheModule.runJob("PUB", {
								channel: "ratings.undislike",
								value: JSON.stringify({
									youtubeId: newSong.youtubeId,
									userId: session.userId,
									likes,
									dislikes
								})
							});

							ActivitiesModule.runJob("ADD_ACTIVITY", {
								userId: session.userId,
								type: "song__undislike",
								payload: {
									message: `Removed <youtubeId>${title} by ${artists.join(
										", "
									)}</youtubeId> from your Disliked Songs`,
									youtubeId: newSong.youtubeId,
									thumbnail
								}
							});
						}
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
						createdBy: playlist.createdBy,
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
					if (playlist.type === "admin")
						hasPermission("playlists.update.displayName", session)
							.then(() => next())
							.catch(() => next("Invalid permissions."));
					else if (playlist.type !== "user" || playlist.createdBy !== session.userId)
						next("Playlist cannot be modified.");
					else next(null);
				},

				next => {
					playlistModel.updateOne(
						{ _id: playlistId },
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
						`Updating display name to "${displayName}" for playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE_DISPLAY_NAME",
					`Successfully updated display name to "${displayName}" for playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.updateDisplayName",
					value: {
						playlistId,
						displayName,
						createdBy: playlist.createdBy,
						privacy: playlist.privacy
					}
				});

				CacheModule.runJob("PUB", {
					channel: "playlist.updated",
					value: { playlistId }
				});

				if (playlist.type !== "admin")
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
	 * Removes a user's own modifiable user playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are removing
	 * @param {Function} cb - gets called with the result
	 */
	remove: isLoginRequired(async function remove(session, playlistId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (playlist.createdBy !== session.userId) return next("You do not own this playlist.");
					if (playlist.type !== "user") return next("Playlist cannot be removed.");
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
						createdBy: playlist.createdBy,
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
	 * Removes a user's modifiable user playlist as an admin
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are removing
	 * @param {Function} cb - gets called with the result
	 */
	removeAdmin: useHasPermission("playlists.removeAdmin", async function removeAdmin(session, playlistId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => next(null, playlist))
						.catch(next);
				},

				(playlist, next) => {
					if (playlist.type !== "user" && playlist.type !== "admin")
						return next("Playlist cannot be removed.");
					return next(null, playlist);
				},

				(playlist, next) => {
					if (playlist.type === "admin") next(null, null);
					else
						userModel.updateOne(
							{ _id: playlist.createdBy },
							{ $pull: { "preferences.orderOfPlaylists": playlist._id } },
							err => next(err, playlist.createdBy)
						);
				},

				(playlistCreator, next) => {
					PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId }, this)
						.then(() => next(null, playlistCreator))
						.catch(next);
				}
			],
			async (err, playlistCreator) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_REMOVE_ADMIN",
						`Removing playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REMOVE_ADMIN",
					`Successfully removed playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.delete",
					value: {
						createdBy: playlistCreator,
						playlistId
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
					if (res.n === 0) next("No user playlist found with that id and owned by you.");
					else if (res.nModified === 0) next(`Nothing changed, the playlist was already ${privacy}.`);
					else {
						PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
							.then(playlist => next(null, playlist))
							.catch(next);
					}
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
						createdBy: playlist.createdBy,
						playlist
					}
				});

				CacheModule.runJob("PUB", {
					channel: "playlist.updated",
					value: { playlistId }
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
	 * Updates the privacy of a playlist
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param {string} playlistId - the id of the playlist we are updating the privacy for
	 * @param {string} privacy - what the new privacy of the playlist should be e.g. public
	 * @param {Function} cb - gets called with the result
	 */
	updatePrivacyAdmin: useHasPermission(
		"playlists.update.privacy",
		async function updatePrivacyAdmin(session, playlistId, privacy, cb) {
			const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

			async.waterfall(
				[
					next => {
						playlistModel.updateOne(
							{ _id: playlistId },
							{ $set: { privacy } },
							{ runValidators: true },
							next
						);
					},

					(res, next) => {
						if (res.n === 0) next("No playlist found with that id.");
						else if (res.nModified === 0) next(`Nothing changed, the playlist was already ${privacy}.`);
						else {
							PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
								.then(playlist => next(null, playlist))
								.catch(next);
						}
					}
				],
				async (err, playlist) => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

						this.log(
							"ERROR",
							"PLAYLIST_UPDATE_PRIVACY_ADMIN",
							`Updating privacy to "${privacy}" for playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
						);

						return cb({ status: "error", message: err });
					}

					this.log(
						"SUCCESS",
						"PLAYLIST_UPDATE_PRIVACY_ADMIn",
						`Successfully updated privacy to "${privacy}" for playlist "${playlistId}" for user "${session.userId}".`
					);

					if (playlist.type === "user") {
						CacheModule.runJob("PUB", {
							channel: "playlist.updatePrivacy",
							value: {
								userId: playlist.createdBy,
								playlist
							}
						});
					}

					CacheModule.runJob("PUB", {
						channel: "playlist.updated",
						value: { playlistId }
					});

					return cb({
						status: "success",
						message: "Playlist has been successfully updated"
					});
				}
			);
		}
	),

	/**
	 * Deletes all orphaned station playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	deleteOrphanedStationPlaylists: useHasPermission("playlists.deleteOrphaned", async function index(session, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Delete orphaned station playlists",
			message: "Deleting orphaned station playlists.",
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
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_DELETE_ORPHANED_STATION_PLAYLISTS",
					"Deleting orphaned station playlists successful."
				);
				this.publishProgress({
					status: "success",
					message: "Successfully deleted orphaned station playlists."
				});
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
	deleteOrphanedGenrePlaylists: useHasPermission("playlists.deleteOrphaned", async function index(session, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Delete orphaned genre playlists",
			message: "Deleting orphaned genre playlists.",
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
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_DELETE_ORPHANED_GENRE_PLAYLISTS",
					"Deleting orphaned genre playlists successful."
				);
				this.publishProgress({
					status: "success",
					message: "Successfully deleted orphaned genre playlists."
				});
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
	requestOrphanedPlaylistSongs: useHasPermission(
		"playlists.requestOrphanedPlaylistSongs",
		async function index(session, cb) {
			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Request orphaned playlist songs",
				message: "Requesting orphaned playlist songs.",
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
						this.publishProgress({
							status: "error",
							message: err
						});
						return cb({ status: "error", message: err });
					}
					this.log(
						"SUCCESS",
						"REQUEST_ORPHANED_PLAYLIST_SONGS",
						"Requesting orphaned playlist songs was successful."
					);
					this.publishProgress({
						status: "success",
						message: "Successfully requested orphaned playlist songs."
					});
					return cb({ status: "success", message: "Successfully requested orphaned playlist songs." });
				}
			);
		}
	),

	/**
	 * Clears and refills a station playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are clearing and refilling
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillStationPlaylist: useHasPermission(
		"playlists.clearAndRefill",
		async function index(session, playlistId, cb) {
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
		}
	),

	/**
	 * Clears and refills a genre playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are clearing and refilling
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillGenrePlaylist: useHasPermission(
		"playlists.clearAndRefill",
		async function index(session, playlistId, cb) {
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
		}
	),

	/**
	 * Clears and refills all station playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillAllStationPlaylists: useHasPermission(
		"playlists.clearAndRefillAll",
		async function index(session, cb) {
			this.keepLongJob();
			this.publishProgress({
				status: "started",
				title: "Clear and refill all station playlists",
				message: "Clearing and refilling all station playlists.",
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
								this.publishProgress({
									status: "update",
									message: `Clearing and refilling "${playlist._id}"`
								});
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
						this.publishProgress({
							status: "error",
							message: err
						});
						return cb({ status: "error", message: err });
					}

					this.log(
						"SUCCESS",
						"PLAYLIST_CLEAR_AND_REFILL_ALL_STATION_PLAYLISTS",
						`Successfully cleared and refilled all station playlists for user "${session.userId}".`
					);
					this.publishProgress({
						status: "success",
						message: "Playlists have been successfully cleared and refilled."
					});
					return cb({
						status: "success",
						message: "Playlists have been successfully cleared and refilled"
					});
				}
			);
		}
	),

	/**
	 * Clears and refills all genre playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	clearAndRefillAllGenrePlaylists: useHasPermission("playlists.clearAndRefillAll", async function index(session, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Clear and refill all genre playlists",
			message: "Clearing and refilling all genre playlists.",
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
							this.publishProgress({
								status: "update",
								message: `Clearing and refilling "${playlist._id}"`
							});
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
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CLEAR_AND_REFILL_ALL_GENRE_PLAYLISTS",
					`Successfully cleared and refilled all genre playlists for user "${session.userId}".`
				);
				this.publishProgress({
					status: "success",
					message: "Playlists have been successfully cleared and refilled."
				});
				return cb({
					status: "success",
					message: "Playlists have been successfully cleared and refilled"
				});
			}
		);
	}),

	/**
	 * Create missing genre playlists
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	createMissingGenrePlaylists: useHasPermission("playlists.createMissing", async function index(session, cb) {
		this.keepLongJob();
		this.publishProgress({
			status: "started",
			title: "Create missing genre playlists",
			message: "Creating missing genre playlists.",
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
					PlaylistsModule.runJob("CREATE_MISSING_GENRE_PLAYLISTS", this)
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
						"PLAYLIST_CREATE_MISSING_GENRE_PLAYLISTS",
						`Creating missing genre playlists failed for user "${session.userId}". "${err}"`
					);
					this.publishProgress({
						status: "error",
						message: err
					});
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_CREATE_MISSING_GENRE_PLAYLISTS",
					`Successfully created missing genre playlists for user "${session.userId}".`
				);
				this.publishProgress({
					status: "success",
					message: "Missing genre playlists have been successfully created."
				});
				return cb({
					status: "success",
					message: "Missing genre playlists have been successfully created"
				});
			}
		);
	})
};
