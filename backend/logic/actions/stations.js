import async from "async";
import mongoose from "mongoose";
import config from "config";

import { isLoginRequired, isOwnerRequired, isAdminRequired } from "./hooks";

// eslint-disable-next-line
import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const WSModule = moduleManager.modules.ws;
const SongsModule = moduleManager.modules.songs;
const PlaylistsModule = moduleManager.modules.playlists;
const CacheModule = moduleManager.modules.cache;
const NotificationsModule = moduleManager.modules.notifications;
const StationsModule = moduleManager.modules.stations;
const ActivitiesModule = moduleManager.modules.activities;

CacheModule.runJob("SUB", {
	channel: "station.updateUsers",
	cb: ({ stationId, usersPerStation }) => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.users.updated", { data: { users: usersPerStation } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.updateUserCount",
	cb: ({ stationId, usersPerStationCount }) => {
		const count = usersPerStationCount || 0;

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.userCount.updated", { data: { userCount: count } }]
		});

		StationsModule.runJob("GET_STATION", { stationId }).then(async station => {
			if (station.privacy === "public")
				WSModule.runJob("EMIT_TO_ROOM", {
					room: "home",
					args: ["event:station.userCount.updated", { data: { stationId, userCount: count } }]
				});
			else {
				const sockets = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", {
					room: "home"
				});

				sockets.forEach(async socketId => {
					const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
					if (!socket) return;
					const { session } = socket;

					if (session.sessionId) {
						CacheModule.runJob("HGET", {
							table: "sessions",
							key: session.sessionId
						}).then(session => {
							if (session)
								DBModule.runJob(
									"GET_MODEL",
									{
										modelName: "user"
									},
									this
								).then(userModel => {
									userModel.findOne({ _id: session.userId }, (err, user) => {
										if (user && user.role === "admin")
											socket.dispatch("event:station.userCount.updated", {
												data: { stationId, count }
											});
										else if (
											user &&
											station.type === "community" &&
											station.owner === session.userId
										)
											socket.dispatch("event:station.userCount.updated", {
												data: { stationId, count }
											});
									});
								});
						});
					}
				});
			}
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.autofillPlaylist",
	cb: data => {
		const { stationId, playlistId } = data;

		PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }).then(playlist =>
			WSModule.runJob("EMIT_TO_ROOMS", {
				rooms: [`station.${stationId}`, `manage-station.${stationId}`],
				args: ["event:station.autofillPlaylist", { data: { stationId, playlist } }]
			})
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "station.blacklistedPlaylist",
	cb: data => {
		const { stationId, playlistId } = data;

		PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }).then(playlist =>
			WSModule.runJob("EMIT_TO_ROOMS", {
				rooms: [`station.${stationId}`, `manage-station.${stationId}`],
				args: ["event:station.blacklistedPlaylist", { data: { stationId, playlist } }]
			})
		);
	}
});

CacheModule.runJob("SUB", {
	channel: "station.removedAutofillPlaylist",
	cb: data => {
		const { stationId, playlistId } = data;
		WSModule.runJob("EMIT_TO_ROOMS", {
			rooms: [`station.${stationId}`, `manage-station.${stationId}`],
			args: ["event:station.removedAutofillPlaylist", { data: { stationId, playlistId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.removedBlacklistedPlaylist",
	cb: data => {
		const { stationId, playlistId } = data;
		WSModule.runJob("EMIT_TO_ROOMS", {
			rooms: [`station.${stationId}`, `manage-station.${stationId}`],
			args: ["event:station.removedBlacklistedPlaylist", { data: { stationId, playlistId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.pause",
	cb: stationId => {
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:station.pause", { data: { pausedAt: station.pausedAt } }]
			});

			WSModule.runJob("EMIT_TO_ROOM", {
				room: `manage-station.${stationId}`,
				args: ["event:station.pause", { data: { stationId, pausedAt: station.pausedAt } }]
			});

			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket => {
					socket.dispatch("event:station.pause", { data: { stationId } });
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.resume",
	cb: stationId => {
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:station.resume", { data: { timePaused: station.timePaused } }]
			});

			WSModule.runJob("EMIT_TO_ROOM", {
				room: `manage-station.${stationId}`,
				args: ["event:station.resume", { data: { stationId, timePaused: station.timePaused } }]
			});

			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			})
				.then(response => {
					const { socketsThatCan } = response;
					socketsThatCan.forEach(socket => {
						socket.dispatch("event:station.resume", { data: { stationId } });
					});
				})
				.catch(console.log);
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.queueUpdate",
	cb: stationId => {
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			if (!station.currentSong && station.queue.length > 0) {
				StationsModule.runJob("INITIALIZE_STATION", {
					stationId
				}).then();
			}

			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:station.queue.updated", { data: { queue: station.queue } }]
			});

			WSModule.runJob("EMIT_TO_ROOM", {
				room: `manage-station.${stationId}`,
				args: ["event:manageStation.queue.updated", { data: { stationId, queue: station.queue } }]
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.repositionSongInQueue",
	cb: res => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${res.stationId}`,
			args: ["event:station.queue.song.repositioned", { data: { song: res.song } }]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `manage-station.${res.stationId}`,
			args: [
				"event:manageStation.queue.song.repositioned",
				{ data: { stationId: res.stationId, song: res.song } }
			]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.voteSkipSong",
	cb: stationId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.voteSkipSong"]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.remove",
	cb: stationId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.deleted"]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `manage-station.${stationId}`,
			args: ["event:station.deleted"]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `home`,
			args: ["event:station.deleted", { data: { stationId } }]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.stations",
			args: ["event:admin.station.deleted", { data: { stationId } }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.create",
	cb: async stationId => {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

		StationsModule.runJob("INITIALIZE_STATION", { stationId }).then(async res => {
			const { station } = res;
			station.userCount = StationsModule.usersPerStationCount[stationId] || 0;

			WSModule.runJob("EMIT_TO_ROOM", {
				room: "admin.stations",
				args: ["event:admin.station.created", { data: { station } }]
			});

			if (station.privacy === "public")
				WSModule.runJob("EMIT_TO_ROOM", {
					room: "home",
					args: ["event:station.created", { data: { station } }]
				});
			else {
				const sockets = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", {
					room: "home"
				});

				sockets.forEach(async socketId => {
					const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
					if (!socket) return;
					const { session } = socket;

					if (session.sessionId) {
						CacheModule.runJob("HGET", {
							table: "sessions",
							key: session.sessionId
						}).then(session => {
							if (session) {
								userModel.findOne({ _id: session.userId }, (err, user) => {
									if (user && user.role === "admin")
										socket.dispatch("event:station.created", { data: { station } });
									else if (user && station.type === "community" && station.owner === session.userId)
										socket.dispatch("event:station.created", { data: { station } });
								});
							}
						});
					}
				});
			}
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.updated",
	cb: async data => {
		const stationModel = await DBModule.runJob("GET_MODEL", {
			modelName: "station"
		});

		const { stationId } = data;

		stationModel.findOne(
			{ _id: stationId },
			["_id", "name", "displayName", "description", "type", "privacy", "owner", "requests", "autofill", "theme"],
			(err, station) => {
				WSModule.runJob("EMIT_TO_ROOMS", {
					rooms: [`station.${stationId}`, `manage-station.${stationId}`, "admin.stations"],
					args: ["event:station.updated", { data: { station } }]
				});

				StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
					room: `home`,
					station
				}).then(response => {
					const { socketsThatCan } = response;
					socketsThatCan.forEach(socket => {
						socket.dispatch("event:station.updated", { data: { station } });
					});
				});

				if (data.previousStation && data.previousStation.privacy !== station.privacy) {
					if (station.privacy === "public") {
						// Station became public

						WSModule.runJob("EMIT_TO_ROOM", {
							room: "home",
							args: ["event:station.created", { data: { station } }]
						});
					} else if (data.previousStation.privacy === "public") {
						// Station became hidden

						StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
							room: `home`,
							station
						}).then(response => {
							const { socketsThatCannot } = response;
							socketsThatCannot.forEach(socket => {
								socket.dispatch("event:station.deleted", { data: { stationId } });
							});
						});
					}
				}
			}
		);
	}
});

export default {
	/**
	 * Get a list of all the stations
	 *
	 * @param {object} session - user session
	 * @param {boolean} adminFilter - whether to filter out stations admins do not own
	 * @param {Function} cb - callback
	 */
	async index(session, adminFilter, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

		async.waterfall(
			[
				// get array of the ids of the user's favorite stations
				next => {
					if (session.userId)
						return userModel.findById(session.userId).select({ favoriteStations: -1 }).exec(next);
					return next(null, { favoriteStations: [] });
				},

				(user, next) => {
					const favoriteStations = user ? user.favoriteStations : [];
					CacheModule.runJob("HGETALL", { table: "stations" }, this).then(stations =>
						next(null, stations, favoriteStations)
					);
				},

				(stations, favorited, next) => {
					const filteredStations = [];

					async.eachLimit(
						stations,
						1,
						(station, nextStation) => {
							async.waterfall(
								[
									callback => {
										// only relevant if user logged in
										if (session.userId) {
											if (favorited.indexOf(station._id) !== -1) station.isFavorited = true;
											return callback();
										}

										return callback();
									},

									callback => {
										StationsModule.runJob(
											"CAN_USER_VIEW_STATION",
											{
												station,
												userId: session.userId
											},
											this
										)
											.then(exists => {
												if (exists && session.userId && station.privacy !== "public") {
													DBModule.runJob("GET_MODEL", { modelName: "user" }, this)
														.then(userModel => {
															userModel.findOne({ _id: session.userId }, (err, user) => {
																if (err) return callback(err);
																if (
																	(user.role !== "admin" &&
																		station.owner !== session.userId) ||
																	(adminFilter &&
																		user.role === "admin" &&
																		station.owner !== session.userId)
																) {
																	return callback(null, false);
																}
																return callback(null, exists);
															});
														})
														.catch(callback);
												} else if (exists && !session.userId && station.privacy !== "public")
													callback(null, false);
												else callback(null, exists);
											})
											.catch(callback);
									}
								],
								(err, exists) => {
									if (err) return this.log("ERROR", "STATIONS_INDEX", err);

									station.userCount = StationsModule.usersPerStationCount[station._id] || 0;

									if (exists) filteredStations.push(station);
									return nextStation();
								}
							);
						},
						() => next(null, filteredStations, favorited)
					);
				}
			],
			async (err, stations, favorited) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_INDEX", `Indexing stations failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_INDEX", `Indexing stations successful.`, false);

				return cb({ status: "success", data: { stations, favorited } });
			}
		);
	},

	/**
	 * Gets stations, used in the admin stations page by the AdvancedTable component
	 *
	 * @param {object} session - the session object automatically added by the websocket
	 * @param page - the page
	 * @param pageSize - the size per page
	 * @param properties - the properties to return for each station
	 * @param sort - the sort object
	 * @param queries - the queries array
	 * @param operator - the operator for queries
	 * @param cb
	 */
	getData: isAdminRequired(async function getSet(session, page, pageSize, properties, sort, queries, operator, cb) {
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
							modelName: "station",
							blacklistedProperties: [],
							specialProperties: {
								owner: [
									{
										$addFields: {
											ownerOID: {
												$convert: {
													input: "$owner",
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
											localField: "ownerOID",
											foreignField: "_id",
											as: "ownerUser"
										}
									},
									{
										$unwind: {
											path: "$ownerUser",
											preserveNullAndEmptyArrays: true
										}
									},
									{
										$addFields: {
											ownerUsername: {
												$cond: [
													{ $eq: [{ $type: "$owner" }, "string"] },
													{ $ifNull: ["$ownerUser.username", "unknown"] },
													"none"
												]
											}
										}
									},
									{
										$project: {
											ownerOID: 0,
											ownerUser: 0
										}
									}
								]
							},
							specialQueries: {
								owner: newQuery => ({ $or: [newQuery, { ownerUsername: newQuery.owner }] })
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
					this.log("ERROR", "STATIONS_GET_DATA", `Failed to get data from stations. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "STATIONS_GET_DATA", `Got data from stations successfully.`);
				return cb({ status: "success", message: "Successfully got data from stations.", data: response });
			}
		);
	}),

	/**
	 * Obtains basic metadata of a station in order to format an activity
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	getStationForActivity(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_GET_STATION_FOR_ACTIVITY",
						`Failed to obtain metadata of station ${stationId} for activity formatting. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"STATIONS_GET_STATION_FOR_ACTIVITY",
					`Obtained metadata of station ${stationId} for activity formatting successfully.`
				);
				return cb({
					status: "success",
					data: {
						title: station.displayName,
						thumbnail: station.currentSong ? station.currentSong.thumbnail : ""
					}
				});
			}
		);
	},

	/**
	 * Verifies that a station exists from its name
	 *
	 * @param {object} session - user session
	 * @param {string} stationName - the station name
	 * @param {Function} cb - callback
	 */
	existsByName(session, stationName, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION_BY_NAME", { stationName }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next(null, false);
					return StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(exists => next(null, exists))
						.catch(next);
				}
			],
			async (err, exists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATION_EXISTS_BY_NAME",
						`Checking if station "${stationName}" exists failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATION_EXISTS_BY_NAME",
					`Station "${stationName}" exists successfully.` /* , false */
				);

				return cb({ status: "success", data: { exists } });
			}
		);
	},

	/**
	 * Verifies that a station exists from its id
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	existsById(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next(null, false);
					return StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(exists => next(null, exists))
						.catch(next);
				}
			],
			async (err, exists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATION_EXISTS_BY_ID",
						`Checking if station "${stationId}" exists failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATION_EXISTS_BY_ID",
					`Station "${stationId}" exists successfully.` /* , false */
				);

				return cb({ status: "success", data: { exists } });
			}
		);
	},

	/**
	 * Gets the official playlist for a station
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	getPlaylist(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					StationsModule.runJob(
						"CAN_USER_VIEW_STATION",
						{
							station,
							userId: session.userId
						},
						this
					)
						.then(canView => {
							if (canView) return next(null, station);
							return next("Insufficient permissions.");
						})
						.catch(err => next(err));
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.type !== "official") return next("This is not an official station.");
					return next();
				},

				next => {
					CacheModule.runJob(
						"HGET",
						{
							table: "officialPlaylists",
							key: stationId
						},
						this
					)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist) return next("Playlist not found.");
					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_GET_PLAYLIST",
						`Getting playlist for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_GET_PLAYLIST",
					`Got playlist for station "${stationId}" successfully.`,
					false
				);

				return cb({ status: "success", data: { songs: playlist.songs } });
			}
		);
	},

	/**
	 * Joins the station by its name
	 *
	 * @param {object} session - user session
	 * @param {string} stationIdentifier - the station name or station id
	 * @param {Function} cb - callback
	 */
	join(session, stationIdentifier, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION_BY_NAME", { stationName: stationIdentifier }, this)
						.then(station => next(null, station))
						.catch(() =>
							// station identifier may be using stationid instead
							StationsModule.runJob("GET_STATION", { stationId: stationIdentifier }, this)
								.then(station => next(null, station))
								.catch(next)
						);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(canView => {
							if (!canView) next("Not allowed to join station.");
							else next(null, station);
						})
						.catch(err => next(err));
				},

				(station, next) => {
					WSModule.runJob("SOCKET_JOIN_ROOM", {
						socketId: session.socketId,
						room: `station.${station._id}`
					});

					const data = {
						_id: station._id,
						type: station.type,
						currentSong: station.currentSong,
						startedAt: station.startedAt,
						paused: station.paused,
						timePaused: station.timePaused,
						pausedAt: station.pausedAt,
						description: station.description,
						displayName: station.displayName,
						name: station.name,
						privacy: station.privacy,
						requests: station.requests,
						autofill: station.autofill,
						owner: station.owner,
						blacklist: station.blacklist,
						theme: station.theme
					};

					StationsModule.userList[session.socketId] = station._id;

					next(null, data);
				},

				(data, next) => {
					data = JSON.parse(JSON.stringify(data));

					data.userCount = StationsModule.usersPerStationCount[data._id] || 0;
					data.users = StationsModule.usersPerStation[data._id] || [];

					if (!data.currentSong || !data.currentSong.title) return next(null, data);

					WSModule.runJob("SOCKET_JOIN_SONG_ROOM", {
						socketId: session.socketId,
						room: `song.${data.currentSong.youtubeId}`
					});

					data.currentSong.skipVotes = data.currentSong.skipVotes.length;

					return SongsModule.runJob(
						"GET_SONG_FROM_YOUTUBE_ID",
						{ youtubeId: data.currentSong.youtubeId },
						this
					)
						.then(response => {
							const { song } = response;
							if (song) {
								data.currentSong.likes = song.likes;
								data.currentSong.dislikes = song.dislikes;
							} else {
								data.currentSong.likes = -1;
								data.currentSong.dislikes = -1;
							}
						})
						.catch(() => {
							data.currentSong.likes = -1;
							data.currentSong.dislikes = -1;
						})
						.finally(() => next(null, data));
				},

				(data, next) => {
					// only relevant if user logged in
					if (session.userId) {
						return StationsModule.runJob(
							"HAS_USER_FAVORITED_STATION",
							{
								userId: session.userId,
								stationId: data._id
							},
							this
						)
							.then(isStationFavorited => {
								data.isFavorited = isStationFavorited;
								return next(null, data);
							})
							.catch(err => next(err));
					}

					return next(null, data);
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_JOIN", `Joining station "${stationIdentifier}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_JOIN", `Joined station "${data._id}" successfully.`);
				return cb({ status: "success", data });
			}
		);
	},

	/**
	 * Gets a station by id
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	getStationById(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob(
						"CAN_USER_VIEW_STATION",
						{
							station,
							userId: session.userId
						},
						this
					)
						.then(canView => {
							if (!canView) next("Not allowed to get station.");
							else next(null, station);
						})
						.catch(err => next(err));
				},

				(station, next) => {
					// only relevant if user logged in
					if (session.userId) {
						return StationsModule.runJob(
							"HAS_USER_FAVORITED_STATION",
							{
								userId: session.userId,
								stationId
							},
							this
						)
							.then(isStationFavorited => {
								station.isFavorited = isStationFavorited;
								return next(null, station);
							})
							.catch(err => next(err));
					}

					return next(null, station);
				},

				(station, next) => {
					const data = {
						_id: station._id,
						type: station.type,
						description: station.description,
						displayName: station.displayName,
						name: station.name,
						privacy: station.privacy,
						requests: station.requests,
						autofill: station.autofill,
						owner: station.owner,
						theme: station.theme,
						paused: station.paused,
						currentSong: station.currentSong,
						isFavorited: station.isFavorited
					};

					next(null, data);
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_STATION_BY_ID", `Getting station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "GET_STATION_BY_ID", `Got station "${stationId}" successfully.`);
				return cb({ status: "success", data: { station: data } });
			}
		);
	},

	getStationAutofillPlaylistsById(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob(
						"CAN_USER_VIEW_STATION",
						{
							station,
							userId: session.userId
						},
						this
					)
						.then(canView => {
							if (!canView) next("Not allowed to get station.");
							else next(null, station);
						})
						.catch(err => next(err));
				},

				(station, next) => {
					const playlists = [];

					async.eachLimit(
						station.autofill.playlists,
						1,
						(playlistId, next) => {
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
								.then(playlist => {
									playlists.push(playlist);
									next();
								})
								.catch(() => {
									playlists.push(null);
									next();
								});
						},
						err => {
							next(err, playlists);
						}
					);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"GET_STATION_AUTOFILL_PLAYLISTS_BY_ID",
						`Getting station "${stationId}"'s autofilling playlists failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"GET_STATION_AUTOFILL_PLAYLISTS_BY_ID",
					`Got station "${stationId}"'s autofilling playlists successfully.`
				);
				return cb({ status: "success", data: { playlists } });
			}
		);
	},

	getStationBlacklistById(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob(
						"CAN_USER_VIEW_STATION",
						{
							station,
							userId: session.userId
						},
						this
					)
						.then(canView => {
							if (!canView) next("Not allowed to get station.");
							else next(null, station);
						})
						.catch(err => next(err));
				},

				(station, next) => {
					const playlists = [];

					async.eachLimit(
						station.blacklist,
						1,
						(playlistId, next) => {
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
								.then(playlist => {
									playlists.push(playlist);
									next();
								})
								.catch(() => {
									playlists.push(null);
									next();
								});
						},
						err => {
							next(err, playlists);
						}
					);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"GET_STATION_BLACKLIST_BY_ID",
						`Getting station "${stationId}"'s blacklist failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}
				this.log(
					"SUCCESS",
					"GET_STATION_BLACKLIST_BY_ID",
					`Got station "${stationId}"'s blacklist successfully.`
				);
				return cb({ status: "success", data: { playlists } });
			}
		);
	},

	/**
	 * Votes to skip a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	voteSkip: isLoginRequired(async function voteSkip(session, stationId, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(canView => {
							if (canView) return next(null, station);
							return next("Insufficient permissions.");
						})
						.catch(err => next(err));
				},

				(station, next) => {
					if (!station.currentSong) return next("There is currently no song to skip.");
					if (station.currentSong.skipVotes.indexOf(session.userId) !== -1)
						return next("You have already voted to skip this song.");
					return next(null, station);
				},

				(station, next) => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $push: { "currentSong.skipVotes": session.userId } },
						next
					);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");

					return StationsModule.runJob("PROCESS_VOTE_SKIPS", { stationId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_VOTE_SKIP", `Vote skipping station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "STATIONS_VOTE_SKIP", `Vote skipping "${stationId}" successful.`);

				CacheModule.runJob("PUB", {
					channel: "station.voteSkipSong",
					value: stationId
				});

				return cb({
					status: "success",
					message: "Successfully voted to skip the song."
				});
			}
		);
	}),

	/**
	 * Force skips a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	forceSkip: isOwnerRequired(function forceSkip(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return next();
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_FORCE_SKIP", `Force skipping station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				StationsModule.runJob("SKIP_STATION", { stationId, natural: false });
				this.log("SUCCESS", "STATIONS_FORCE_SKIP", `Force skipped station "${stationId}" successfully.`);
				return cb({
					status: "success",
					message: "Successfully skipped station."
				});
			}
		);
	}),

	/**
	 * Leaves the user's current station
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - id of station to leave
	 * @param {Function} cb - callback
	 */
	leave(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return next();
				}
			],
			async (err, userCount) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_LEAVE", `Leaving station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_LEAVE", `Left station "${stationId}" successfully.`);

				WSModule.runJob("SOCKET_LEAVE_ROOM", { socketId: session.socketId, room: `station.${stationId}` });
				WSModule.runJob("SOCKETS_LEAVE_SONG_ROOMS", { sockets: [session.socketId] });

				delete StationsModule.userList[session.socketId];

				return cb({
					status: "success",
					message: "Successfully left station.",
					data: { userCount }
				});
			}
		);
	},

	/**
	 * Updates a station's settings
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param station - updated station object
	 * @param cb
	 */
	update: isOwnerRequired(async function update(session, stationId, newStation, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					stationModel.findOne({ _id: stationId }, next);
				},

				(previousStation, next) => {
					const { name, displayName, description, privacy, requests, autofill, theme } = newStation;
					const { enabled, limit, mode } = autofill;
					// This object makes sure only certain properties can be changed by a user
					const setObject = {
						name,
						displayName,
						description,
						privacy,
						requests,
						"autofill.enabled": enabled,
						"autofill.limit": limit,
						"autofill.mode": mode,
						theme
					};

					stationModel.updateOne({ _id: stationId }, { $set: setObject }, { runValidators: true }, err => {
						next(err, previousStation);
					});
				},

				(previousStation, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station, previousStation))
						.catch(next);
				},

				(station, previousStation, next) => {
					if (
						newStation.autofill.enabled &&
						JSON.stringify(newStation.autofill) !== JSON.stringify(previousStation.autofill)
					)
						StationsModule.runJob("AUTOFILL_STATION", { stationId }, this)
							.then(() => {
								CacheModule.runJob("PUB", {
									channel: "station.queueUpdate",
									value: stationId
								})
									.then(() => next(null, station, previousStation))
									.catch(next);
							})
							.catch(err => {
								if (err === "Autofill is disabled in this station" || err === "Autofill limit reached")
									next(null, station, previousStation);
								else next(err);
							});
					else next(null, station, previousStation);
				},

				(station, previousStation, next) => {
					playlistModel.updateOne(
						{ _id: station.playlist },
						{ $set: { displayName: `Station - ${station.displayName}` } },
						err => {
							next(err, station, previousStation);
						}
					);
				}
			],
			async (err, station, previousStation) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log("ERROR", "STATIONS_UPDATE", `Updating station "${stationId}" failed. "${err}"`);

					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_UPDATE", `Updated station "${stationId}" successfully.`);

				CacheModule.runJob("PUB", {
					channel: "station.updated",
					value: { stationId, previousStation }
				});

				return cb({
					status: "success",
					message: "Successfully updated the station."
				});
			}
		);
	}),

	/**
	 * Pauses a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	pause: isOwnerRequired(async function pause(session, stationId, cb) {
		const stationModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "station"
			},
			this
		);
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.paused) return next("That station was already paused.");
					return stationModel.updateOne(
						{ _id: stationId },
						{ $set: { paused: true, pausedAt: Date.now() } },
						next
					);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_PAUSE", `Pausing station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "STATIONS_PAUSE", `Paused station "${stationId}" successfully.`);
				CacheModule.runJob("PUB", {
					channel: "station.pause",
					value: stationId
				});
				NotificationsModule.runJob("UNSCHEDULE", {
					name: `stations.nextSong?id=${stationId}`
				});
				return cb({
					status: "success",
					message: "Successfully paused."
				});
			}
		);
	}),

	/**
	 * Resumes a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	resume: isOwnerRequired(async function resume(session, stationId, cb) {
		const stationModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "station"
			},
			this
		);
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (!station.paused) return next("That station is not paused.");
					station.timePaused += Date.now() - station.pausedAt;
					return stationModel.updateOne(
						{ _id: stationId },
						{
							$set: { paused: false },
							$inc: { timePaused: Date.now() - station.pausedAt }
						},
						next
					);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(() => next())
						.catch(next);
				},

				next => {
					StationsModule.runJob("PROCESS_VOTE_SKIPS", { stationId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_RESUME", `Resuming station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "STATIONS_RESUME", `Resuming station "${stationId}" successfully.`);
				CacheModule.runJob("PUB", {
					channel: "station.resume",
					value: stationId
				});
				return cb({
					status: "success",
					message: "Successfully resumed."
				});
			}
		);
	}),

	/**
	 * Removes a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	remove: isOwnerRequired(async function remove(session, stationId, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					stationModel.findById(stationId, (err, station) => {
						if (err) return next(err);
						return next(null, station);
					});
				},

				(station, next) => {
					stationModel.deleteOne({ _id: stationId }, err => next(err, station));
				},

				(station, next) => {
					CacheModule.runJob("HDEL", { table: "stations", key: stationId }, this)
						.then(() => next(null, station))
						.catch(next);
				},

				// remove the playlist for the station
				(station, next) => {
					if (station.playlist)
						PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId: station.playlist })
							.then(() => {})
							.catch(next);
					next(null, station);
				},

				// remove reference to the station id in any array of a user's favorite stations
				(station, next) => {
					userModel.updateMany(
						{ favoriteStations: stationId },
						{ $pull: { favoriteStations: stationId } },
						err => next(err, station)
					);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_REMOVE", `Removing station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_REMOVE", `Removing station "${stationId}" successfully.`);

				CacheModule.runJob("PUB", {
					channel: "station.remove",
					value: stationId
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__remove",
					payload: { message: `Removed a station named ${station.displayName}` }
				});

				ActivitiesModule.runJob("REMOVE_ACTIVITY_REFERENCES", { type: "stationId", stationId });

				return cb({
					status: "success",
					message: "Successfully removed."
				});
			}
		);
	}),

	/**
	 * Create a station
	 *
	 * @param session
	 * @param data - the station data
	 * @param cb
	 */
	create: isLoginRequired(async function create(session, data, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		data.name = data.name.toLowerCase();

		let blacklist = [
			"about",
			"support",
			"staff",
			"help",
			"news",
			"terms",
			"privacy",
			"profile",
			"c",
			"community",
			"tos",
			"login",
			"register",
			"p",
			"official",
			"o",
			"faq",
			"team",
			"donate",
			"buy",
			"shop",
			"forums",
			"explore",
			"settings",
			"admin",
			"auth",
			"reset_password",
			"backend",
			"api",
			"songs",
			"playlists",
			"playlist",
			"albums",
			"artists",
			"artist",
			"station"
		];

		if (data.type === "community" && config.has("blacklistedCommunityStationNames"))
			blacklist = [...blacklist, ...config.get("blacklistedCommunityStationNames")];

		async.waterfall(
			[
				next => {
					if (!data) return next("Invalid data.");
					return next();
				},

				next => {
					stationModel.findOne(
						{
							$or: [{ name: data.name }, { displayName: new RegExp(`^${data.displayName}$`, "i") }]
						},
						next
					);
				},

				(station, next) => {
					this.log(station);

					if (station) return next("A station with that name or display name already exists.");

					if (blacklist.indexOf(data.name) !== -1)
						return next("That name is blacklisted. Please use a different name.");

					if (data.type === "official") {
						return userModel.findOne({ _id: session.userId }, (err, user) => {
							if (err) return next(err);
							if (!user) return next("User not found.");
							if (user.role !== "admin") return next("Admin required.");
							return next();
						});
					}
					return next();
				},

				next => {
					const stationId = mongoose.Types.ObjectId();
					playlistModel.create(
						{
							displayName: `Station - ${data.name}`,
							songs: [],
							createdBy: data.type === "official" ? "Musare" : session.userId,
							createdFor: `${stationId}`,
							createdAt: Date.now(),
							type: "station"
						},
						(err, playlist) => {
							next(err, playlist, stationId);
						}
					);
				},

				(playlist, stationId, next) => {
					const { name, displayName, description, type } = data;
					if (type === "official") {
						stationModel.create(
							{
								_id: stationId,
								name,
								displayName,
								description,
								playlist: playlist._id,
								type,
								privacy: "private",
								queue: [],
								currentSong: null
							},
							next
						);
					} else {
						stationModel.create(
							{
								_id: stationId,
								name,
								displayName,
								description,
								playlist: playlist._id,
								type,
								privacy: "private",
								owner: session.userId,
								queue: [],
								currentSong: null
							},
							next
						);
					}
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_CREATE", `Creating station failed. "${err}"`);
					cb({ status: "error", message: err });
				} else {
					this.log("SUCCESS", "STATIONS_CREATE", `Created station "${station._id}" successfully.`);

					CacheModule.runJob("PUB", {
						channel: "station.create",
						value: station._id
					});

					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "station__create",
						payload: {
							message: `Created a station named <stationId>${station.displayName}</stationId>`,
							stationId: station._id
						}
					});

					cb({
						status: "success",
						message: "Successfully created station."
					});
				}
			}
		);
	}),

	/**
	 * Adds song to station queue
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param youtubeId - the song id
	 * @param cb
	 */
	addToQueue: isLoginRequired(async function addToQueue(session, stationId, youtubeId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		const stationModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "station"
			},
			this
		);

		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (!station.requests.enabled) return next("Requests are disabled in this station.");

					if (
						station.requests.access === "owner" ||
						(station.requests.access === "user" && station.privacy === "private")
					) {
						return userModel.findOne({ _id: session.userId }, (err, user) => {
							if (err) return next(err);
							if (user.role !== "admin" && station.owner !== session.userId)
								return next("You do not have permission to add songs to queue.");
							return next(null, station);
						});
					}

					return next(null, station);
				},

				(station, next) =>
					StationsModule.runJob(
						"CAN_USER_VIEW_STATION",
						{
							station,
							userId: session.userId
						},
						this
					)
						.then(canView => {
							if (canView) return next(null, station);
							return next("Insufficient permissions.");
						})
						.catch(err => next(err)),

				(station, next) => {
					if (station.currentSong && station.currentSong.youtubeId === youtubeId)
						return next("That song is currently playing.");

					return async.each(
						station.queue,
						(queueSong, next) => {
							if (queueSong.youtubeId === youtubeId) return next("That song is already in the queue.");
							return next();
						},
						err => next(err, station)
					);
				},

				(station, next) => {
					DBModule.runJob("GET_MODEL", { modelName: "user" }, this)
						.then(UserModel => {
							UserModel.findOne(
								{ _id: session.userId },
								{ "preferences.anonymousSongRequests": 1 },
								(err, user) => next(err, station, user)
							);
						})
						.catch(next);
				},

				(station, user, next) => {
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
							const { _id, title, skipDuration, artists, thumbnail, duration, verified } = song;
							next(
								null,
								{
									_id,
									youtubeId,
									title,
									skipDuration,
									artists,
									thumbnail,
									duration,
									verified
								},
								station
							);
						})
						.catch(next);
				},

				(song, station, next) => {
					const blacklist = [];
					async.eachLimit(
						station.blacklist,
						1,
						(playlistId, next) => {
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
								.then(playlist => {
									blacklist.push(playlist);
									next();
								})
								.catch(next);
						},
						err => {
							next(err, song, station, blacklist);
						}
					);
				},

				(song, station, blacklist, next) => {
					const blacklistedSongs = blacklist
						.flatMap(blacklistedPlaylist => blacklistedPlaylist.songs)
						.reduce(
							(items, item) =>
								items.find(x => x.youtubeId === item.youtubeId) ? [...items] : [...items, item],
							[]
						);

					if (
						blacklistedSongs.find(blacklistedSong => blacklistedSong._id.toString() === song._id.toString())
					)
						next("That song is in an blacklisted playlist and cannot be played.");
					else next(null, song, station);
				},

				(song, station, next) => {
					song.requestedBy = session.userId;
					song.requestedAt = Date.now();
					return next(null, song, station);
				},

				(song, station, next) => {
					if (station.queue.length === 0) return next(null, song);
					let totalSongs = 0;
					station.queue.forEach(song => {
						if (session.userId === song.requestedBy) {
							totalSongs += 1;
						}
					});

					if (totalSongs >= station.requests.limit)
						return next(`The max amount of songs per user is ${station.requests.limit}.`);

					return next(null, song);
				},

				// (song, station, next) => {
				// 	song.requestedBy = session.userId;
				// 	song.requestedAt = Date.now();
				// 	let totalDuration = 0;
				// 	station.queue.forEach(song => {
				// 		totalDuration += song.duration;
				// 	});
				// 	if (totalDuration >= 3600 * 3) return next("The max length of the queue is 3 hours.");
				// 	return next(null, song, station);
				// },

				// (song, station, next) => {
				// 	if (station.queue.length === 0) return next(null, song, station);
				// 	let totalDuration = 0;
				// 	const userId = station.queue[station.queue.length - 1].requestedBy;
				// 	station.queue.forEach(song => {
				// 		if (userId === song.requestedBy) {
				// 			totalDuration += song.duration;
				// 		}
				// 	});

				// 	if (totalDuration >= 900) return next("The max length of songs per user is 15 minutes.");
				// 	return next(null, song, station);
				// },

				// (song, station, next) => {
				// 	if (station.queue.length === 0) return next(null, song);
				// 	let totalSongs = 0;
				// 	const userId = station.queue[station.queue.length - 1].requestedBy;
				// 	station.queue.forEach(song => {
				// 		if (userId === song.requestedBy) {
				// 			totalSongs += 1;
				// 		}
				// 	});

				// 	if (totalSongs <= 2) return next(null, song);
				// 	if (totalSongs > 3)
				// 		return next("The max amount of songs per user is 3, and only 2 in a row is allowed.");
				// 	if (
				// 		station.queue[station.queue.length - 2].requestedBy !== userId ||
				// 		station.queue[station.queue.length - 3] !== userId
				// 	)
				// 		return next("The max amount of songs per user is 3, and only 2 in a row is allowed.");

				// 	return next(null, song);
				// },

				(song, next) => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $push: { queue: song } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_ADD_SONG_TO_QUEUE",
						`Adding song "${youtubeId}" to station "${stationId}" queue failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_ADD_SONG_TO_QUEUE",
					`Added song "${youtubeId}" to station "${stationId}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.queueUpdate",
					value: stationId
				});

				return cb({
					status: "success",
					message: "Successfully added song to queue."
				});
			}
		);
	}),

	/**
	 * Removes song from station queue
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param youtubeId - the youtube id
	 * @param cb
	 */
	removeFromQueue: isOwnerRequired(async function removeFromQueue(session, stationId, youtubeId, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					if (!youtubeId) return next("Invalid youtube id.");
					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");

					return async.each(
						station.queue,
						(queueSong, next) => {
							if (queueSong.youtubeId === youtubeId) return next(true);
							return next();
						},
						err => {
							if (err === true) return next();
							return next("Song is not currently in the queue.");
						}
					);
				},

				next => {
					stationModel.updateOne({ _id: stationId }, { $pull: { queue: { youtubeId } } }, next);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => {
							if (station.autofill.enabled)
								StationsModule.runJob("AUTOFILL_STATION", { stationId }, this)
									.then(() => next(null, station))
									.catch(err => {
										if (
											err === "Autofill is disabled in this station" ||
											err === "Autofill limit reached"
										)
											return next(null, station);
										return next(err);
									});
							else next(null, station);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_REMOVE_SONG_TO_QUEUE",
						`Removing song "${youtubeId}" from station "${stationId}" queue failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_REMOVE_SONG_TO_QUEUE",
					`Removed song "${youtubeId}" from station "${stationId}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.queueUpdate",
					value: stationId
				});

				return cb({
					status: "success",
					message: "Successfully removed song from queue."
				});
			}
		);
	}),

	/**
	 * Gets the queue from a station
	 *
	 * @param {object} session - user session
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	getQueue(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return next(null, station);
				},

				(station, next) => {
					StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(canView => {
							if (canView) return next(null, station);
							return next("Insufficient permissions.");
						})
						.catch(err => next(err));
				},

				(station, next) => next(null, station.queue)
			],
			async (err, queue) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_GET_QUEUE",
						`Getting queue for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "STATIONS_GET_QUEUE", `Got queue for station "${stationId}" successfully.`);

				return cb({
					status: "success",
					message: "Successfully got queue.",
					data: { queue }
				});
			}
		);
	},

	/**
	 * Reposition a song in station queue
	 *
	 * @param {object} session - user session
	 * @param {object} song - contains details about the song that is to be repositioned
	 * @param {string} song.youtubeId - the youtube id of the song
	 * @param {number} song.newIndex - the new position for the song in the queue
	 * @param {number} song.oldIndex - the old position of the song in the queue
	 * @param {string} stationId - the station id
	 * @param {Function} cb - callback
	 */
	repositionSongInQueue: isOwnerRequired(async function repositionQueue(session, stationId, song, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					if (!song || !song.youtubeId) return next("You must provide a song to reposition.");
					return next();
				},

				// remove song from queue
				next => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $pull: { queue: { youtubeId: song.youtubeId } } },
						next
					);
				},

				// add song back to queue (in new position)
				(res, next) => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $push: { queue: { $each: [song], $position: song.newIndex } } },
						err => next(err)
					);
				},

				// update the cache representation of the station
				next => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_REPOSITION_SONG_IN_QUEUE",
						`Repositioning song ${song.youtubeId} in queue of station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_REPOSITION_SONG_IN_QUEUE",
					`Repositioned song ${song.youtubeId} in queue of station "${stationId}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.repositionSongInQueue",
					value: {
						song: {
							youtubeId: song.youtubeId,
							oldIndex: song.oldIndex,
							newIndex: song.newIndex
						},
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully repositioned song in queue."
				});
			}
		);
	}),

	/**
	 * Autofill a playlist in a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the playlist id
	 * @param cb
	 */
	autofillPlaylist: isOwnerRequired(async function autofillPlaylist(session, stationId, playlistId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.autofill.playlists.indexOf(playlistId) !== -1)
						return next("That playlist is already autofilling.");
					if (station.autofill.mode === "sequential" && station.autofill.playlists.length > 0)
						return next("Error: Only 1 playlist can be autofilling in sequential mode.");
					return next();
				},

				next => {
					StationsModule.runJob("AUTOFILL_PLAYLIST", { stationId, playlistId }, this)
						.then(() => {
							next();
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_AUTOFILL_PLAYLIST",
						`Including playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_AUTOFILL_PLAYLIST",
					`Including playlist "${playlistId}" for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				CacheModule.runJob("PUB", {
					channel: "station.autofillPlaylist",
					value: {
						playlistId,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully added autofill playlist."
				});
			}
		);
	}),

	/**
	 * Remove autofilled playlist from a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the playlist id
	 * @param cb
	 */
	removeAutofillPlaylist: isOwnerRequired(async function removeAutofillPlaylist(session, stationId, playlistId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.autofill.playlists.indexOf(playlistId) === -1)
						return next("That playlist is not autofilling.");
					return next();
				},

				next => {
					StationsModule.runJob("REMOVE_AUTOFILL_PLAYLIST", { stationId, playlistId }, this)
						.then(() => {
							next();
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_REMOVE_AUTOFILL_PLAYLIST",
						`Removing autofill playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_REMOVE_AUTOFILL_PLAYLIST",
					`Removing autofill playlist "${playlistId}" for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				CacheModule.runJob("PUB", {
					channel: "station.removedAutofillPlaylist",
					value: {
						playlistId,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully removed autofill playlist."
				});
			}
		);
	}),

	/**
	 * Blacklist a playlist in a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the playlist id
	 * @param cb
	 */
	blacklistPlaylist: isOwnerRequired(async function blacklistPlaylist(session, stationId, playlistId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.blacklist.indexOf(playlistId) !== -1)
						return next("That playlist is already blacklisted.");
					return next();
				},

				next => {
					StationsModule.runJob("BLACKLIST_PLAYLIST", { stationId, playlistId }, this)
						.then(() => {
							next();
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_BLACKLIST_PLAYLIST",
						`Blacklisting playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_BLACKLIST_PLAYLIST",
					`Blacklisting playlist "${playlistId}" for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				CacheModule.runJob("PUB", {
					channel: "station.blacklistedPlaylist",
					value: {
						playlistId,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully blacklisted playlist."
				});
			}
		);
	}),

	/**
	 * Remove blacklisted a playlist from a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the playlist id
	 * @param cb
	 */
	removeBlacklistedPlaylist: isOwnerRequired(async function removeBlacklistedPlaylist(
		session,
		stationId,
		playlistId,
		cb
	) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.blacklist.indexOf(playlistId) === -1) return next("That playlist is not blacklisted.");
					return next();
				},

				next => {
					StationsModule.runJob("REMOVE_BLACKLISTED_PLAYLIST", { stationId, playlistId }, this)
						.then(() => {
							next();
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_REMOVE_BLACKLISTED_PLAYLIST",
						`Removing blacklisted playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_REMOVE_BLACKLISTED_PLAYLIST",
					`Removing blacklisted playlist "${playlistId}" for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				CacheModule.runJob("PUB", {
					channel: "station.removedBlacklistedPlaylist",
					value: {
						playlistId,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully removed blacklisted playlist."
				});
			}
		);
	}),

	favoriteStation: isLoginRequired(async function favoriteStation(session, stationId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					return StationsModule.runJob("CAN_USER_VIEW_STATION", { station, userId: session.userId }, this)
						.then(canView => {
							if (canView) return next(null, station);
							return next("Insufficient permissions.");
						})
						.catch(err => next(err));
				},

				(station, next) => {
					userModel.updateOne(
						{ _id: session.userId },
						{ $addToSet: { favoriteStations: stationId } },
						(err, res) => next(err, station, res)
					);
				},

				(station, res, next) => {
					if (res.nModified === 0) return next("The station was already favorited.");
					return next(null, station);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "FAVORITE_STATION", `Favoriting station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "FAVORITE_STATION", `Favorited station "${stationId}" successfully.`);

				CacheModule.runJob("PUB", {
					channel: "user.favoritedStation",
					value: {
						userId: session.userId,
						stationId
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__favorite",
					payload: {
						message: `Favorited station <stationId>${station.displayName}</stationId>`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Succesfully favorited station."
				});
			}
		);
	}),

	unfavoriteStation: isLoginRequired(async function unfavoriteStation(session, stationId, cb) {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }, this);

		async.waterfall(
			[
				next => {
					userModel.updateOne({ _id: session.userId }, { $pull: { favoriteStations: stationId } }, next);
				},

				(res, next) => {
					if (res.nModified === 0) return next("The station wasn't favorited.");
					return next();
				},

				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "UNFAVORITE_STATION", `Unfavoriting station "${stationId}" failed. "${err}"`);
					return cb({ status: "error", message: err });
				}

				this.log("SUCCESS", "UNFAVORITE_STATION", `Unfavorited station "${stationId}" successfully.`);

				CacheModule.runJob("PUB", {
					channel: "user.unfavoritedStation",
					value: {
						userId: session.userId,
						stationId
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__unfavorite",
					payload: {
						message: `Unfavorited station <stationId>${station.displayName}</stationId>`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Succesfully unfavorited station."
				});
			}
		);
	}),

	/**
	 * Clears every station queue
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	clearEveryStationQueue: isAdminRequired(async function clearEveryStationQueue(session, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("CLEAR_EVERY_STATION_QUEUE", {}, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "CLEAR_EVERY_STATION_QUEUE", `Clearing every station queue failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "CLEAR_EVERY_STATION_QUEUE", "Clearing every station queue was successful.");
				return cb({ status: "success", message: "Successfully cleared every station queue." });
			}
		);
	}),

	/**
	 * Reset a station queue
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} stationId - the station id
	 * @param {Function} cb - gets called with the result
	 */
	resetQueue: isAdminRequired(async function resetQueue(session, stationId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("RESET_QUEUE", { stationId }, this)
						.then(() => next())
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "RESET_QUEUE", `Resetting station queue failed. "${err}"`);
					return cb({ status: "error", message: err });
				}
				this.log("SUCCESS", "RESET_QUEUE", "Resetting station queue was successful.");
				return cb({ status: "success", message: "Successfully reset station queue." });
			}
		);
	}),

	/**
	 * Gets skip votes for a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param stationId - the song id to get skipvotes for
	 * @param cb
	 */

	getSkipVotes: isLoginRequired(async function getSkipVotes(session, stationId, songId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(res => next(null, res.currentSong))
						.catch(console.log);
				},

				(currentSong, next) => {
					if (currentSong && currentSong._id === songId)
						next(null, {
							skipVotes: currentSong.skipVotes.length,
							skipVotesCurrent: true
						});
					else
						next(null, {
							skipVotes: 0,
							skipVotesCurrent: false
						});
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_GET_SKIP_VOTES",
						`User "${session.userId}" failed to get skip votes for ${stationId}. "${err}"`
					);
					return cb({ status: "error", message: err });
				}

				const { skipVotes, skipVotesCurrent } = data;

				return cb({
					status: "success",
					data: {
						skipVotes,
						skipVotesCurrent
					}
				});
			}
		);
	})
};
