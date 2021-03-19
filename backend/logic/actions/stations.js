import async from "async";
import mongoose from "mongoose";

import { isLoginRequired, isOwnerRequired } from "./hooks";

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
const YouTubeModule = moduleManager.modules.youtube;

CacheModule.runJob("SUB", {
	channel: "station.updateUsers",
	cb: ({ stationId, usersPerStation }) => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:users.updated", usersPerStation]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.updateUserCount",
	cb: ({ stationId, usersPerStationCount }) => {
		const count = usersPerStationCount || 0;

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:userCount.updated", count]
		});

		StationsModule.runJob("GET_STATION", { stationId }).then(async station => {
			if (station.privacy === "public")
				WSModule.runJob("EMIT_TO_ROOM", {
					room: "home",
					args: ["event:userCount.updated", stationId, count]
				});
			else {
				const sockets = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", {
					room: "home"
				});

				sockets.forEach(async socketId => {
					const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
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
								).then(userModel =>
									userModel.findOne({ _id: session.userId }, (err, user) => {
										if (user.role === "admin")
											socket.dispatch("event:userCount.updated", stationId, count);
										else if (station.type === "community" && station.owner === session.userId)
											socket.dispatch("event:userCount.updated", stationId, count);
									})
								);
						});
					}
				});
			}
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.updateTheme",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${data.stationId}`,
			args: ["event:theme.updated", data.theme]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.queueLockToggled",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${data.stationId}`,
			args: ["event:queueLockToggled", data.locked]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.updatePartyMode",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${data.stationId}`,
			args: ["event:partyMode.updated", data.partyMode]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "privatePlaylist.selected",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${data.stationId}`,
			args: ["event:privatePlaylist.selected", data.playlistId]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "privatePlaylist.deselected",
	cb: data => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${data.stationId}`,
			args: ["event:privatePlaylist.deselected"]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.pause",
	cb: stationId => {
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:stations.pause", { pausedAt: station.pausedAt }]
			});

			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket => {
					socket.dispatch("event:station.pause", { stationId });
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
				args: ["event:stations.resume", { timePaused: station.timePaused }]
			});

			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			})
				.then(response => {
					const { socketsThatCan } = response;
					socketsThatCan.forEach(socket => {
						socket.dispatch("event:station.resume", { stationId });
					});
				})
				.catch(console.log);
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.privacyUpdate",
	cb: response => {
		const { stationId, previousPrivacy } = response;
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			if (previousPrivacy !== station.privacy) {
				if (station.privacy === "public") {
					// Station became public

					WSModule.runJob("EMIT_TO_ROOM", {
						room: "home",
						args: ["event:stations.created", station]
					});
				} else if (previousPrivacy === "public") {
					// Station became hidden

					StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
						room: `home`,
						station
					}).then(response => {
						const { socketsThatCan, socketsThatCannot } = response;
						socketsThatCan.forEach(socket => {
							socket.dispatch("event:station.updatePrivacy", { stationId, privacy: station.privacy });
						});
						socketsThatCannot.forEach(socket => {
							socket.dispatch("event:station.removed", { stationId });
						});
					});
				} else {
					// Station was hidden and is still hidden

					StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
						room: `home`,
						station
					}).then(response => {
						const { socketsThatCan } = response;
						socketsThatCan.forEach(socket => {
							socket.dispatch("event:station.updatePrivacy", { stationId, privacy: station.privacy });
						});
					});
				}
			}
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.nameUpdate",
	cb: res => {
		const { stationId, name } = res;

		StationsModule.runJob("GET_STATION", { stationId }).then(station =>
			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket => socket.dispatch("event:station.updateName", { stationId, name }));
			})
		);

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.updateName", { stationId, name }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.displayNameUpdate",
	cb: response => {
		const { stationId, displayName } = response;

		StationsModule.runJob("GET_STATION", { stationId }).then(station =>
			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket =>
					socket.dispatch("event:station.updateDisplayName", { stationId, displayName })
				);
			})
		);

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.updateDisplayName", { stationId, displayName }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.descriptionUpdate",
	cb: response => {
		const { stationId, description } = response;

		StationsModule.runJob("GET_STATION", { stationId }).then(station =>
			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket =>
					socket.dispatch("event:station.updateDescription", { stationId, description })
				);
			})
		);

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.updateDescription", { stationId, description }]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.themeUpdate",
	cb: response => {
		const { stationId } = response;
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:station.themeUpdated", station.theme]
			});
			StationsModule.runJob("GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION", {
				room: `home`,
				station
			}).then(response => {
				const { socketsThatCan } = response;
				socketsThatCan.forEach(socket => {
					socket.dispatch("event:station.themeUpdated", { stationId, theme: station.theme });
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.queueUpdate",
	cb: stationId => {
		StationsModule.runJob("GET_STATION", { stationId }).then(station => {
			WSModule.runJob("EMIT_TO_ROOM", {
				room: `station.${stationId}`,
				args: ["event:queue.update", station.queue]
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.voteSkipSong",
	cb: stationId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:song.voteSkipSong"]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.remove",
	cb: stationId => {
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:stations.remove"]
		});
		console.log(111, "REMOVED");
		WSModule.runJob("EMIT_TO_ROOM", {
			room: `home`,
			args: ["event:station.removed", { stationId }]
		});
		WSModule.runJob("EMIT_TO_ROOM", {
			room: "admin.stations",
			args: ["event:admin.station.removed", stationId]
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "station.create",
	cb: async stationId => {
		const userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" });

		StationsModule.runJob("INITIALIZE_STATION", { stationId }).then(async response => {
			const { station } = response;
			station.userCount = StationsModule.usersPerStationCount[stationId] || 0;

			WSModule.runJob("EMIT_TO_ROOM", {
				room: "admin.stations",
				args: ["event:admin.station.added", station]
			}).then(() => {});

			// TODO If community, check if on whitelist
			if (station.privacy === "public")
				WSModule.runJob("EMIT_TO_ROOM", {
					room: "home",
					args: ["event:stations.created", station]
				}).then(() => {});
			else {
				const sockets = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", {
					room: "home"
				});

				sockets.forEach(async socketId => {
					const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this);
					const { session } = socket;

					if (session.sessionId) {
						CacheModule.runJob("HGET", {
							table: "sessions",
							key: session.sessionId
						}).then(session => {
							if (session) {
								userModel.findOne({ _id: session.userId }, (err, user) => {
									if (user.role === "admin") socket.dispatch("event:stations.created", station);
									else if (station.type === "community" && station.owner === session.userId)
										socket.dispatch("event:stations.created", station);
								});
							}
						});
					}
				});
			}
		});
	}
});

export default {
	/**
	 * Get a list of all the stations
	 *
	 * @param {object} session - user session
	 * @param {Function} cb - callback
	 */
	index(session, cb) {
		async.waterfall(
			[
				next => {
					CacheModule.runJob("HGETALL", { table: "stations" }, this).then(stations => next(null, stations));
				},

				(items, next) => {
					const filteredStations = [];

					async.each(
						items,
						(station, nextStation) => {
							async.waterfall(
								[
									callback => {
										// only relevant if user logged in
										if (session.userId) {
											return StationsModule.runJob("HAS_USER_FAVORITED_STATION", {
												userId: session.userId,
												stationId: station._id
											})
												.then(isStationFavorited => {
													station.isFavorited = isStationFavorited;
													return callback();
												})
												.catch(err => callback(err));
										}

										return callback();
									},

									callback => {
										StationsModule.runJob(
											"CAN_USER_VIEW_STATION",
											{
												station,
												userId: session.userId,
												hideUnlisted: true
											},
											this
										)
											.then(exists => callback(null, exists))
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
						() => next(null, filteredStations)
					);
				}
			],
			async (err, stations) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_INDEX", `Indexing stations failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "STATIONS_INDEX", `Indexing stations successful.`, false);

				return cb({ status: "success", stations });
			}
		);
	},

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
					return cb({ status: "failure", message: err });
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
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATION_EXISTS_BY_NAME",
					`Station "${stationName}" exists successfully.` /* , false */
				);

				return cb({ status: "success", exists });
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
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATION_EXISTS_BY_ID",
					`Station "${stationId}" exists successfully.` /* , false */
				);

				return cb({ status: "success", exists });
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
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_GET_PLAYLIST",
					`Got playlist for station "${stationId}" successfully.`,
					false
				);

				return cb({ status: "success", data: playlist.songs });
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
						locked: station.locked,
						partyMode: station.partyMode,
						owner: station.owner,
						privatePlaylist: station.privatePlaylist,
						includedPlaylists: station.includedPlaylists,
						excludedPlaylists: station.excludedPlaylists,
						genres: station.genres,
						blacklistedGenres: station.blacklistedGenres,
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
						room: `song.${data.currentSong.songId}`
					});

					data.currentSong.skipVotes = data.currentSong.skipVotes.length;

					return SongsModule.runJob("GET_SONG_FROM_ID", { songId: data.currentSong.songId }, this)
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
					return cb({ status: "failure", message: err });
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
					const data = {
						_id: station._id,
						type: station.type,
						description: station.description,
						displayName: station.displayName,
						name: station.name,
						privacy: station.privacy,
						locked: station.locked,
						partyMode: station.partyMode,
						owner: station.owner,
						privatePlaylist: station.privatePlaylist,
						genres: station.genres,
						blacklistedGenres: station.blacklistedGenres,
						theme: station.theme
					};

					next(null, data);
				}
			],
			async (err, data) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "GET_STATION_BY_ID", `Getting station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "GET_STATION_BY_ID", `Got station "${stationId}" successfully.`);
				return cb({ status: "success", station: data });
			}
		);
	},

	getStationIncludedPlaylistsById(session, stationId, cb) {
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
						station.includedPlaylists,
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
						"GET_STATION_INCLUDED_PLAYLISTS_BY_ID",
						`Getting station "${stationId}"'s included playlists failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"GET_STATION_INCLUDED_PLAYLISTS_BY_ID",
					`Got station "${stationId}"'s included playlists successfully.`
				);
				return cb({ status: "success", playlists });
			}
		);
	},

	getStationExcludedPlaylistsById(session, stationId, cb) {
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
						station.excludedPlaylists,
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
						"GET_STATION_EXCLUDED_PLAYLISTS_BY_ID",
						`Getting station "${stationId}"'s excluded playlists failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"GET_STATION_EXCLUDED_PLAYLISTS_BY_ID",
					`Got station "${stationId}"'s excluded playlists successfully.`
				);
				return cb({ status: "success", playlists });
			}
		);
	},

	/**
	 * Toggles if a station is locked
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	toggleLock: isOwnerRequired(async function toggleLock(session, stationId, cb) {
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
					stationModel.updateOne({ _id: stationId }, { $set: { locked: !station.locked } }, next);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
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
						"STATIONS_UPDATE_LOCKED_STATUS",
						`Toggling the queue lock for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_LOCKED_STATUS",
					`Toggled the queue lock for station "${stationId}" successfully to "${station.locked}".`
				);
				CacheModule.runJob("PUB", {
					channel: "station.queueLockToggled",
					value: {
						stationId,
						locked: station.locked
					}
				});
				return cb({ status: "success", data: station.locked });
			}
		);
	}),

	/**
	 * Votes to skip a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	voteSkip: isLoginRequired(async function voteSkip(session, stationId, cb) {
		const stationModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "station"
			},
			this
		);

		let skipVotes = 0;
		let shouldSkip = false;

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
					return next(null, station);
				},

				(station, next) => {
					skipVotes = station.currentSong.skipVotes.length;
					WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: `station.${stationId}` }, this)
						.then(sockets => next(null, sockets))
						.catch(next);
				},

				(sockets, next) => {
					if (sockets.length <= skipVotes) shouldSkip = true;
					next();
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_VOTE_SKIP", `Vote skipping station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "STATIONS_VOTE_SKIP", `Vote skipping "${stationId}" successful.`);

				CacheModule.runJob("PUB", {
					channel: "station.voteSkipSong",
					value: stationId
				});

				if (shouldSkip) StationsModule.runJob("SKIP_STATION", { stationId });

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
					return cb({ status: "failure", message: err });
				}
				StationsModule.runJob("SKIP_STATION", { stationId });
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
			async (err, userCount) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_LEAVE", `Leaving station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "STATIONS_LEAVE", `Left station "${stationId}" successfully.`);

				WSModule.runJob("SOCKET_LEAVE_ROOMS", { socketId: session });

				delete StationsModule.userList[session.socketId];

				return cb({
					status: "success",
					message: "Successfully left station.",
					userCount
				});
			}
		);
	},

	/**
	 * Updates a station's name
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newName - the new station name
	 * @param cb
	 */
	updateName: isOwnerRequired(async function updateName(session, stationId, newName, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $set: { name: newName } },
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
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);

					this.log(
						"ERROR",
						"STATIONS_UPDATE_NAME",
						`Updating station "${stationId}" name to "${newName}" failed. "${err}"`
					);

					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_NAME",
					`Updated station "${stationId}" name to "${newName}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.nameUpdate",
					value: { stationId, name: newName }
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__edit_name",
					payload: {
						message: `Changed name of station <stationId>${station.displayName}</stationId> to ${newName}`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully updated the name."
				});
			}
		);
	}),

	/**
	 * Updates a station's display name
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newDisplayName - the new station display name
	 * @param cb
	 */
	updateDisplayName: isOwnerRequired(async function updateDisplayName(session, stationId, newDisplayName, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		async.waterfall(
			[
				next => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $set: { displayName: newDisplayName } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					playlistModel.updateOne(
						{ _id: station.playlist2 },
						{ $set: { displayName: `Station - ${station.displayName}` } },
						err => {
							next(err, station);
						}
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_DISPLAY_NAME",
						`Updating station "${stationId}" displayName to "${newDisplayName}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_DISPLAY_NAME",
					`Updated station "${stationId}" displayName to "${newDisplayName}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.displayNameUpdate",
					value: { stationId, displayName: newDisplayName }
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__edit_display_name",
					payload: {
						message: `Changed display name of station <stationId>${newDisplayName}</stationId>`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully updated the display name."
				});
			}
		);
	}),

	/**
	 * Updates a station's description
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newDescription - the new station description
	 * @param cb
	 */
	updateDescription: isOwnerRequired(async function updateDescription(session, stationId, newDescription, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $set: { description: newDescription } },
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
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_DESCRIPTION",
						`Updating station "${stationId}" description to "${newDescription}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_DESCRIPTION",
					`Updated station "${stationId}" description to "${newDescription}" successfully.`
				);

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__edit_description",
					payload: {
						message: `Changed description of station <stationId>${station.displayName}</stationId> to ${newDescription}`,
						stationId
					}
				});

				CacheModule.runJob("PUB", {
					channel: "station.descriptionUpdate",
					value: { stationId, description: newDescription }
				});

				return cb({
					status: "success",
					message: "Successfully updated the description."
				});
			}
		);
	}),

	/**
	 * Updates a station's privacy
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newPrivacy - the new station privacy
	 * @param cb
	 */
	updatePrivacy: isOwnerRequired(async function updatePrivacy(session, stationId, newPrivacy, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		let previousPrivacy = null;

		async.waterfall(
			[
				next => {
					stationModel.findOne({ _id: stationId }, next);
				},

				(station, next) => {
					if (!station) next("No station found.");
					else {
						previousPrivacy = station.privacy;
						next();
					}
				},

				next => {
					stationModel.updateOne(
						{ _id: stationId },
						{ $set: { privacy: newPrivacy } },
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
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_PRIVACY",
						`Updating station "${stationId}" privacy to "${newPrivacy}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_PRIVACY",
					`Updated station "${stationId}" privacy to "${newPrivacy}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.privacyUpdate",
					value: { stationId, previousPrivacy }
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__edit_privacy",
					payload: {
						message: `Changed privacy of station <stationId>${station.displayName}</stationId> to ${newPrivacy}`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully updated the privacy."
				});
			}
		);
	}),

	/**
	 * Updates a station's genres
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newGenres - the new station genres
	 * @param cb
	 */
	updateGenres: isOwnerRequired(async function updateGenres(session, stationId, newGenres, cb) {
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
					const playlists = [];
					async.eachLimit(
						newGenres,
						1,
						(genre, next) => {
							PlaylistsModule.runJob("GET_GENRE_PLAYLIST", { genre, includeSongs: false }, this)
								.then(response => {
									playlists.push(response.playlist);
									next();
								})
								.catch(err => {
									if (err.message === "Playlist not found")
										next(
											`The genre playlist for "${genre}" was not found. Please ensure that this genre playlist exists.`
										);
									else next(err);
								});
						},
						err => {
							next(
								err,
								station,
								playlists.map(playlist => playlist._id.toString())
							);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToRemoveFromExcluded = playlists.filter(
						playlistId => station.excludedPlaylists.indexOf(playlistId) !== -1
					);
					console.log(
						`playlistsToRemoveFromExcluded: ${playlistsToRemoveFromExcluded.length}`,
						playlistsToRemoveFromExcluded
					);

					async.eachLimit(
						playlistsToRemoveFromExcluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("REMOVE_EXCLUDED_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err, station, playlists);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToRemoveFromIncluded = station.includedPlaylists.filter(
						playlistId => playlists.indexOf(playlistId) === -1
					);
					console.log(
						`playlistsToRemoveFromIncluded: ${playlistsToRemoveFromIncluded.length}`,
						playlistsToRemoveFromIncluded
					);

					async.eachLimit(
						playlistsToRemoveFromIncluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("REMOVE_INCLUDED_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err, station, playlists);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToAddToIncluded = playlists.filter(
						playlistId => station.includedPlaylists.indexOf(playlistId) === -1
					);
					console.log(
						`playlistsToAddToIncluded: ${playlistsToAddToIncluded.length}`,
						playlistsToAddToIncluded
					);

					async.eachLimit(
						playlistsToAddToIncluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("INCLUDE_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err);
						}
					);
				},

				next => {
					PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err });
					this.log(
						"ERROR",
						"STATIONS_UPDATE_GENRES",
						`Updating station "${stationId}" genres to "${newGenres}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_GENRES",
					`Updated station "${stationId}" genres to "${newGenres}" successfully.`
				);

				if (newGenres.length > 0) {
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "station__edit_genres",
						payload: {
							message: `Updated genres of station <stationId>${station.displayName}</stationId> to 
							${newGenres.join(", ")}`,
							stationId
						}
					});
				} else {
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "station__edit_genres",
						payload: {
							message: `Removed all genres of station <stationId>${station.displayName}</stationId>`,
							stationId
						}
					});
				}

				return cb({
					status: "success",
					message: "Successfully updated the genres."
				});
			}
		);
	}),

	/**
	 * Updates a station's blacklisted genres
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newBlacklistedGenres - the new station blacklisted genres
	 * @param cb
	 */
	updateBlacklistedGenres: isOwnerRequired(async function updateBlacklistedGenres(
		session,
		stationId,
		newBlacklistedGenres,
		cb
	) {
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
					const playlists = [];
					async.eachLimit(
						newBlacklistedGenres,
						1,
						(genre, next) => {
							PlaylistsModule.runJob("GET_GENRE_PLAYLIST", { genre, includeSongs: false }, this)
								.then(response => {
									playlists.push(response.playlist);
									next();
								})
								.catch(err => {
									if (err.message === "Playlist not found")
										next(
											`The genre playlist for "${genre}" was not found. Please ensure that this genre playlist exists.`
										);
									else next(err);
								});
						},
						err => {
							next(
								err,
								station,
								playlists.map(playlist => playlist._id.toString())
							);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToRemoveFromIncluded = playlists.filter(
						playlistId => station.includedPlaylists.indexOf(playlistId) !== -1
					);
					console.log(
						`playlistsToRemoveFromIncluded: ${playlistsToRemoveFromIncluded.length}`,
						playlistsToRemoveFromIncluded
					);

					async.eachLimit(
						playlistsToRemoveFromIncluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("REMOVE_INCLUDED_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err, station, playlists);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToRemoveFromExcluded = station.excludedPlaylists.filter(
						playlistId => playlists.indexOf(playlistId) === -1
					);
					console.log(
						`playlistsToRemoveFromExcluded: ${playlistsToRemoveFromExcluded.length}`,
						playlistsToRemoveFromExcluded
					);

					async.eachLimit(
						playlistsToRemoveFromExcluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("REMOVE_EXCLUDED_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err, station, playlists);
						}
					);
				},

				(station, playlists, next) => {
					const playlistsToAddToExcluded = playlists.filter(
						playlistId => station.excludedPlaylists.indexOf(playlistId) === -1
					);
					console.log(
						`playlistsToAddToExcluded: ${playlistsToAddToExcluded.length}`,
						playlistsToAddToExcluded
					);

					async.eachLimit(
						playlistsToAddToExcluded,
						1,
						(playlistId, next) => {
							StationsModule.runJob("EXCLUDE_PLAYLIST", { stationId, playlistId }, this)
								.then(() => {
									next();
								})
								.catch(next);
						},
						err => {
							next(err);
						}
					);
				},

				next => {
					PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_BLACKLISTED_GENRES",
						`Updating station "${stationId}" blacklisted genres to "${newBlacklistedGenres}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_BLACKLISTED_GENRES",
					`Updated station "${stationId}" blacklisted genres to "${newBlacklistedGenres}" successfully.`
				);

				if (newBlacklistedGenres.length > 0) {
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "station__edit_blacklisted_genres",
						payload: {
							message: `Updated blacklisted genres of station <stationId>${
								station.displayName
							}</stationId> to ${newBlacklistedGenres.join(", ")}`,
							stationId
						}
					});
				} else {
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						type: "station__edit_blacklisted_genres",
						payload: {
							message: `Removed all blacklisted genres of station <stationId>${station.displayName}</stationId>`,
							stationId
						}
					});
				}

				return cb({
					status: "success",
					message: "Successfully updated the blacklisted genres."
				});
			}
		);
	}),

	/**
	 * Updates a station's party mode
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newPartyMode - the new station party mode
	 * @param cb
	 */
	updatePartyMode: isOwnerRequired(async function updatePartyMode(session, stationId, newPartyMode, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

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
					if (station.partyMode === newPartyMode)
						return next(`The party mode was already ${newPartyMode ? "enabled." : "disabled."}`);
					return stationModel.updateOne(
						{ _id: stationId },
						{ $set: { partyMode: newPartyMode, queue: [] } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					CacheModule.runJob("PUB", {
						channel: "station.queueUpdate",
						value: stationId
					})
						.then()
						.catch();
					StationsModule.runJob("UPDATE_STATION", { stationId }, this)
						.then(station => {
							next(null, station);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_PARTY_MODE",
						`Updating station "${stationId}" party mode to "${newPartyMode}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_PARTY_MODE",
					`Updated station "${stationId}" party mode to "${newPartyMode}" successfully.`
				);
				CacheModule.runJob("PUB", {
					channel: "station.updatePartyMode",
					value: {
						stationId,
						partyMode: newPartyMode
					}
				});
				StationsModule.runJob("SKIP_STATION", { stationId });
				return cb({
					status: "success",
					message: "Successfully updated the party mode."
				});
			}
		);
	}),

	/**
	 * Updates a station's theme
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newTheme - the new station theme
	 * @param cb
	 */
	updateTheme: isOwnerRequired(async function updateTheme(session, stationId, newTheme, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

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
					if (station.theme === newTheme) return next("No change in theme.");
					return stationModel.updateOne(
						{ _id: stationId },
						{ $set: { theme: newTheme } },
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
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_UPDATE_THEME",
						`Updating station "${stationId}" theme to "${newTheme}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_UPDATE_THEME",
					`Updated station "${stationId}" theme to "${newTheme}" successfully.`
				);

				CacheModule.runJob("PUB", {
					channel: "station.themeUpdate",
					value: { stationId }
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					type: "station__edit_theme",
					payload: {
						message: `Changed theme of station <stationId>${station.displayName}</stationId> to ${newTheme}`,
						stationId
					}
				});

				return cb({
					status: "success",
					message: "Successfully updated the theme."
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
						.then(station => {
							next(null, station);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_PAUSE", `Pausing station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
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
						.then(station => {
							next(null, station);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_RESUME", `Resuming station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
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

				(station, next) => {
					if (station.playlist2)
						PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId: station.playlist2 })
							.then(() => {})
							.catch(next);
					next(null, station);
				}
			],
			async (err, station) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_REMOVE", `Removing station "${stationId}" failed. "${err}"`);
					return cb({ status: "failure", message: err });
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

		const blacklist = [
			"country",
			"edm",
			"musare",
			"hip-hop",
			"rap",
			"top-hits",
			"todays-hits",
			"old-school",
			"christmas",
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
			"trap",
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
			"reset_password"
		];

		async.waterfall(
			[
				next => {
					if (!data) return next("Invalid data.");
					return next();
				},

				next => {
					stationModel.findOne(
						{
							$or: [
								{ name: data.name },
								{
									displayName: new RegExp(`^${data.displayName}$`, "i")
								}
							]
						},
						next
					);
				},

				// eslint-disable-next-line consistent-return
				(station, next) => {
					this.log(station);

					if (station) return next("A station with that name or display name already exists.");
					const { name, displayName, description, playlist, type, genres, blacklistedGenres } = data;
					const stationId = mongoose.Types.ObjectId();

					if (type === "official") {
						return userModel.findOne({ _id: session.userId }, (err, user) => {
							if (err) return next(err);
							if (!user) return next("User not found.");
							if (user.role !== "admin") return next("Admin required.");

							return async.waterfall(
								[
									next => {
										const playlists = [];
										async.eachLimit(
											genres,
											1,
											(genre, next) => {
												PlaylistsModule.runJob(
													"GET_GENRE_PLAYLIST",
													{ genre, includeSongs: false },
													this
												)
													.then(response => {
														playlists.push(response.playlist);
														next();
													})
													.catch(err => {
														next(
															`An error occurred when trying to get genre playlist for genre ${genre}. Error: ${err}.`
														);
													});
											},
											err => {
												next(
													err,
													playlists.map(playlist => playlist._id.toString())
												);
											}
										);
									},

									(genrePlaylistIds, next) => {
										const playlists = [];
										async.eachLimit(
											blacklistedGenres,
											1,
											(genre, next) => {
												PlaylistsModule.runJob(
													"GET_GENRE_PLAYLIST",
													{ genre, includeSongs: false },
													this
												)
													.then(response => {
														playlists.push(response.playlist);
														next();
													})
													.catch(err => {
														next(
															`An error occurred when trying to get genre playlist for genre ${genre}. Error: ${err}.`
														);
													});
											},
											err => {
												next(
													err,
													genrePlaylistIds,
													playlists.map(playlist => playlist._id.toString())
												);
											}
										);
									},

									(genrePlaylistIds, blacklistedGenrePlaylistIds, next) => {
										const duplicateGenre =
											genrePlaylistIds.length !== new Set(genrePlaylistIds).size;
										const duplicateBlacklistedGenre =
											genrePlaylistIds.length !== new Set(genrePlaylistIds).size;
										const duplicateCross =
											genrePlaylistIds.length + blacklistedGenrePlaylistIds.length !==
											new Set([...genrePlaylistIds, ...blacklistedGenrePlaylistIds]).size;
										if (duplicateGenre)
											return next("You cannot have the same genre included twice.");
										if (duplicateBlacklistedGenre)
											return next("You cannot have the same blacklisted genre included twice.");
										if (duplicateCross)
											return next(
												"You cannot have the same genre included and blacklisted at the same time."
											);
										return next(null, genrePlaylistIds, blacklistedGenrePlaylistIds);
									}
								],
								(err, genrePlaylistIds, blacklistedGenrePlaylistIds) => {
									if (err) return next(err);
									return playlistModel.create(
										{
											isUserModifiable: false,
											displayName: `Station - ${displayName}`,
											songs: [],
											createdBy: "Musare",
											createdFor: `${stationId}`,
											createdAt: Date.now(),
											type: "station"
										},

										(err, playlist2) => {
											if (err) next(err);
											else {
												stationModel.create(
													{
														_id: stationId,
														name,
														displayName,
														description,
														type,
														privacy: "private",
														playlist2: playlist2._id,
														playlist,
														currentSong: StationsModule.defaultSong
													},
													(err, station) => {
														next(
															err,
															station,
															genrePlaylistIds,
															blacklistedGenrePlaylistIds
														);
													}
												);
											}
										}
									);
								}
							);
						});
					}
					if (type === "community") {
						if (blacklist.indexOf(name) !== -1)
							return next("That name is blacklisted. Please use a different name.");
						return playlistModel.create(
							{
								isUserModifiable: false,
								displayName: `Station - ${name}`,
								songs: [],
								createdBy: session.userId,
								createdFor: `${stationId}`,
								createdAt: Date.now(),
								type: "station"
							},

							(err, playlist2) => {
								if (err) next(err);
								else {
									stationModel.create(
										{
											_id: stationId,
											name,
											displayName,
											description,
											playlist2: playlist2._id,
											type,
											privacy: "private",
											owner: session.userId,
											queue: [],
											currentSong: null
										},
										(err, station) => {
											next(err, station, null, null);
										}
									);
								}
							}
						);
					}
				},

				(station, genrePlaylistIds, blacklistedGenrePlaylistIds, next) => {
					if (station.type !== "official") return next(null, station);

					const stationId = station._id;
					console.log(111, station, genrePlaylistIds, blacklistedGenrePlaylistIds, next);

					return async.waterfall(
						[
							next => {
								async.eachLimit(
									genrePlaylistIds,
									1,
									(playlistId, next) => {
										StationsModule.runJob("INCLUDE_PLAYLIST", { stationId, playlistId }, this)
											.then(() => {
												next();
											})
											.catch(next);
									},
									next
								);
							},

							next => {
								async.eachLimit(
									blacklistedGenrePlaylistIds,
									1,
									(playlistId, next) => {
										StationsModule.runJob("EXCLUDE_PLAYLIST", { stationId, playlistId }, this)
											.then(() => {
												next();
											})
											.catch(next);
									},
									next
								);
							},

							next => {
								PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
								next();
							}
						],
						async err => {
							if (err) {
								err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
								this.log(
									"ERROR",
									"STATIONS_CREATE",
									`Created station ${stationId} successfully, but an error occurred during playing including/excluding. Error: ${err}`
								);
							}
							next(null, station, err);
						}
					);
				}
			],
			async (err, station, extraError) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log("ERROR", "STATIONS_CREATE", `Creating station failed. "${err}"`);
					cb({ status: "failure", message: err });
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

					if (!extraError) {
						cb({
							status: "success",
							message: "Successfully created station."
						});
					} else {
						cb({
							status: "success",
							message: `Successfully created station, but with one error at the end: ${extraError}`
						});
					}
				}
			}
		);
	}),

	/**
	 * Adds song to station queue
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param songId - the song id
	 * @param cb
	 */
	addToQueue: isLoginRequired(async function addToQueue(session, stationId, songId, cb) {
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
					if (!station.partyMode) return next("Station is not in party mode.");

					if (station.locked) {
						return userModel.findOne({ _id: session.userId }, (err, user) => {
							if (user.role !== "admin" && station.owner !== session.userId)
								return next("Only owners and admins can add songs to a locked queue.");
							return next(null, station);
						});
					}

					return next(null, station);
				},

				(station, next) => {
					if (station.type !== "community") return next("That station is not a community station.");

					return StationsModule.runJob(
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
					if (station.currentSong && station.currentSong.songId === songId)
						return next("That song is currently playing.");

					return async.each(
						station.queue,
						(queueSong, next) => {
							if (queueSong.songId === songId) return next("That song is already in the queue.");
							return next();
						},
						err => next(err, station)
					);
				},

				(station, next) => {
					SongsModule.runJob("GET_SONG_FROM_ID", { songId }, this)
						.then(res => {
							if (res.song) return next(null, res.song, station);

							return YouTubeModule.runJob("GET_SONG", { songId }, this)
								.then(response => {
									const { song } = response;
									song.artists = [];
									song.skipDuration = 0;
									song.likes = -1;
									song.dislikes = -1;
									song.thumbnail = "empty";
									song.explicit = false;

									return next(null, song, station);
								})
								.catch(err => {
									next(err);
								});
						})
						.catch(err => {
							next(err);
						});
				},

				(song, station, next) => {
					song.requestedBy = session.userId;
					song.requestedAt = Date.now();
					song._id = null;

					let totalDuration = 0;
					station.queue.forEach(song => {
						totalDuration += song.duration;
					});
					if (totalDuration >= 3600 * 3) return next("The max length of the queue is 3 hours.");
					return next(null, song, station);
				},

				(song, station, next) => {
					if (station.queue.length === 0) return next(null, song, station);
					let totalDuration = 0;
					const userId = station.queue[station.queue.length - 1].requestedBy;
					station.queue.forEach(song => {
						if (userId === song.requestedBy) {
							totalDuration += song.duration;
						}
					});

					if (totalDuration >= 900) return next("The max length of songs per user is 15 minutes.");
					return next(null, song, station);
				},

				(song, station, next) => {
					if (station.queue.length === 0) return next(null, song);
					let totalSongs = 0;
					const userId = station.queue[station.queue.length - 1].requestedBy;
					station.queue.forEach(song => {
						if (userId === song.requestedBy) {
							totalSongs += 1;
						}
					});

					if (totalSongs <= 2) return next(null, song);
					if (totalSongs > 3)
						return next("The max amount of songs per user is 3, and only 2 in a row is allowed.");
					if (
						station.queue[station.queue.length - 2].requestedBy !== userId ||
						station.queue[station.queue.length - 3] !== userId
					)
						return next("The max amount of songs per user is 3, and only 2 in a row is allowed.");

					return next(null, song);
				},

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

				// (res, next) => {
				// 	StationsModule.runJob("UPDATE_STATION", { stationId }, this)
				// 		.then(station => {
				// 			next(null, station);
				// 		})
				// 		.catch(next);
				// }
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_ADD_SONG_TO_QUEUE",
						`Adding song "${songId}" to station "${stationId}" queue failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_ADD_SONG_TO_QUEUE",
					`Added song "${songId}" to station "${stationId}" successfully.`
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
	 * @param songId - the song id
	 * @param cb
	 */
	removeFromQueue: isOwnerRequired(async function removeFromQueue(session, stationId, songId, cb) {
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		async.waterfall(
			[
				next => {
					if (!songId) return next("Invalid song id.");
					return StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.type !== "community") return next("Station is not a community station.");

					return async.each(
						station.queue,
						(queueSong, next) => {
							if (queueSong.songId === songId) return next(true);
							return next();
						},
						err => {
							if (err === true) return next();
							return next("Song is not currently in the queue.");
						}
					);
				},

				next => {
					stationModel.updateOne({ _id: stationId }, { $pull: { queue: { songId } } }, next);
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
						"STATIONS_REMOVE_SONG_TO_QUEUE",
						`Removing song "${songId}" from station "${stationId}" queue failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_REMOVE_SONG_TO_QUEUE",
					`Removed song "${songId}" from station "${stationId}" successfully.`
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

				(station, next) => {
					if (station.type === "official") next(null, station.queue);
					else next(null, station.queue);
				}
			],
			async (err, queue) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"STATIONS_GET_QUEUE",
						`Getting queue for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log("SUCCESS", "STATIONS_GET_QUEUE", `Got queue for station "${stationId}" successfully.`);

				return cb({
					status: "success",
					message: "Successfully got queue.",
					queue
				});
			}
		);
	},

	/**
	 * Selects a private playlist for a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the private playlist id
	 * @param cb
	 */
	selectPrivatePlaylist: isOwnerRequired(async function selectPrivatePlaylist(session, stationId, playlistId, cb) {
		async.waterfall(
			[
				next => {
					StationsModule.runJob("GET_STATION", { stationId }, this)
						.then(station => next(null, station))
						.catch(next);
				},

				(station, next) => {
					if (!station) return next("Station not found.");
					if (station.type !== "community") return next("Station is not a community station.");
					if (station.includedPlaylists.indexOf(playlistId) !== -1)
						return next("That playlist is already included.");
					return next();
				},

				next => {
					StationsModule.runJob("INCLUDE_PLAYLIST", { stationId, playlistId }, this)
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
						"STATIONS_SELECT_PRIVATE_PLAYLIST",
						`Selecting private playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_SELECT_PRIVATE_PLAYLIST",
					`Selected private playlist "${playlistId}" for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				// CacheModule.runJob("PUB", {
				// 	channel: "privatePlaylist.selected",
				// 	value: {
				// 		playlistId,
				// 		stationId
				// 	}
				// });

				return cb({
					status: "success",
					message: "Successfully selected playlist."
				});
			}
		);
	}),

	/**
	 * Deselects the private playlist selected in a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	deselectPrivatePlaylist: isOwnerRequired(async function deselectPrivatePlaylist(
		session,
		stationId,
		playlistId,
		cb
	) {
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
					if (station.type !== "community") return next("Station is not a community station.");
					if (station.includedPlaylists.indexOf(playlistId) === -1)
						return next("That playlist is not included.");
					return next();
				},

				next => {
					StationsModule.runJob("REMOVE_INCLUDED_PLAYLIST", { stationId, playlistId }, this)
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
						"STATIONS_DESELECT_PRIVATE_PLAYLIST",
						`Deselecting private playlist for station "${stationId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"STATIONS_DESELECT_PRIVATE_PLAYLIST",
					`Deselected private playlist for station "${stationId}" successfully.`
				);

				PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();

				// CacheModule.runJob("PUB", {
				// 	channel: "privatePlaylist.deselected",
				// 	value: {
				// 		stationId
				// 	}
				// });

				return cb({
					status: "success",
					message: "Successfully deselected playlist."
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
					return cb({ status: "failure", message: err });
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
					return cb({ status: "failure", message: err });
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
	})
};
