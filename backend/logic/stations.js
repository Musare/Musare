import async from "async";

import CoreClass from "../core";

let StationsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let WSModule;
let SongsModule;
let PlaylistsModule;
let NotificationsModule;

class _StationsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("stations");

		StationsModule = this;
	}

	/**
	 * Initialises the stations module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;
		WSModule = this.moduleManager.modules.ws;
		SongsModule = this.moduleManager.modules.songs;
		PlaylistsModule = this.moduleManager.modules.playlists;
		NotificationsModule = this.moduleManager.modules.notifications;

		this.userList = {};
		this.usersPerStation = {};
		this.usersPerStationCount = {};

		// TEMP
		CacheModule.runJob("SUB", {
			channel: "station.pause",
			cb: async stationId => {
				NotificationsModule.runJob("REMOVE", {
					subscription: `stations.nextSong?id=${stationId}`
				}).then();
			}
		});

		CacheModule.runJob("SUB", {
			channel: "station.resume",
			cb: async stationId => {
				StationsModule.runJob("INITIALIZE_STATION", { stationId }).then();
			}
		});

		CacheModule.runJob("SUB", {
			channel: "station.queueUpdate",
			cb: async stationId => {
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

		const stationModel = (this.stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }));
		const stationSchema = (this.stationSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "station" }));

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						this.setStage(2);
						CacheModule.runJob("HGETALL", { table: "stations" })
							.then(stations => {
								next(null, stations);
							})
							.catch(next);
					},

					(stations, next) => {
						this.setStage(3);

						if (!stations) return next();

						const stationIds = Object.keys(stations);

						return async.each(
							stationIds,
							(stationId, next) => {
								stationModel.findOne({ _id: stationId }, (err, station) => {
									if (err) next(err);
									else if (!station) {
										CacheModule.runJob("HDEL", {
											table: "stations",
											key: stationId
										})
											.then(() => {
												next();
											})
											.catch(next);
									} else next();
								});
							},
							next
						);
					},

					next => {
						this.setStage(4);
						stationModel.find({}, next);
					},

					(stations, next) => {
						this.setStage(5);
						async.each(
							stations,
							(station, next2) => {
								async.waterfall(
									[
										next => {
											CacheModule.runJob("HSET", {
												table: "stations",
												key: station._id,
												value: stationSchema(station)
											})
												.then(station => next(null, station))
												.catch(next);
										},

										(station, next) => {
											StationsModule.runJob(
												"INITIALIZE_STATION",
												{
													stationId: station._id
												},
												null,
												-1
											)
												.then(() => {
													next();
												})
												.catch(next);
										}
									],
									err => {
										next2(err);
									}
								);
							},
							next
						);
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", {
							error: err
						});
						reject(new Error(err));
					} else {
						resolve();
					}
				}
			);
		});
	}

	/**
	 * Initialises a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - id of the station to initialise
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	INITIALIZE_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						StationsModule.runJob(
							"GET_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},
					(station, next) => {
						if (!station) return next("Station not found.");

						return NotificationsModule.runJob(
							"UNSCHEDULE",
							{
								name: `stations.nextSong?id=${station._id}`
							},
							this
						)
							.then()
							.catch()
							.finally(() => {
								NotificationsModule.runJob("SUBSCRIBE", {
									name: `stations.nextSong?id=${station._id}`,
									cb: () =>
										StationsModule.runJob("SKIP_STATION", {
											stationId: station._id,
											natural: true
										}),
									unique: true,
									station
								})
									.then()
									.catch();

								if (station.paused) return next(true, station);

								return next(null, station);
							});
					},
					(station, next) => {
						if (!station.currentSong) {
							return StationsModule.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									natural: false
								},
								this
							)
								.then(station => {
									next(true, station);
								})
								.catch(next)
								.finally(() => {});
						}

						let timeLeft =
							station.currentSong.duration * 1000 - (Date.now() - station.startedAt - station.timePaused);

						if (Number.isNaN(timeLeft)) timeLeft = -1;

						if (station.currentSong.duration * 1000 < timeLeft || timeLeft < 0) {
							return StationsModule.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									natural: false
								},
								this
							)
								.then(station => {
									next(null, station);
								})
								.catch(next);
						}
						// name, time, cb, station
						NotificationsModule.runJob("SCHEDULE", {
							name: `stations.nextSong?id=${station._id}`,
							time: timeLeft,
							station
						});

						return next(null, station);
					}
				],
				async (err, station) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						reject(new Error(err));
					} else resolve(station);
				}
			);
		});
	}

	/**
	 * Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - id of the station
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						CacheModule.runJob("HGET", { table: "stations", key: payload.stationId }, this)
							.then(station => next(null, station))
							.catch(next);
					},

					(station, next) => {
						if (station) return next(true, station);
						return StationsModule.stationModel.findOne({ _id: payload.stationId }, next);
					},

					(station, next) => {
						if (station) {
							station = StationsModule.stationSchema(station);
							CacheModule.runJob("HSET", {
								table: "stations",
								key: payload.stationId,
								value: station
							})
								.then()
								.catch();
							next(true, station);
						} else next("Station not found");
					}
				],
				async (err, station) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						reject(new Error(err));
					} else resolve(station);
				}
			);
		});
	}

	/**
	 * Attempts to get a station by name, firstly from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationName - the unique name of the station
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_STATION_BY_NAME(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						StationsModule.stationModel.findOne({ name: payload.stationName }, next);
					},

					(station, next) => {
						if (station) {
							station = StationsModule.stationSchema(station);
							CacheModule.runJob("HSET", {
								table: "stations",
								key: station._id,
								value: station
							});
							next(true, station);
						} else next("Station not found");
					}
				],
				(err, station) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(station);
				}
			);
		});
	}

	/**
	 * Updates the station in cache from mongo or deletes station in cache if no longer in mongo.
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station to update
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	UPDATE_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						StationsModule.stationModel.findOne({ _id: payload.stationId }, next);
					},

					(station, next) => {
						if (!station) {
							CacheModule.runJob("HDEL", {
								table: "stations",
								key: payload.stationId
							})
								.then()
								.catch();
							return next("Station not found");
						}

						return CacheModule.runJob(
							"HSET",
							{
								table: "stations",
								key: payload.stationId,
								value: station
							},
							this
						)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					}
				],
				async (err, station) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						reject(new Error(err));
					} else resolve(station);
				}
			);
		});
	}

	/**
	 * Autofill station queue from station playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station
	 * @param {string} payload.ignoreExistingQueue - ignore the existing queue songs, replacing the old queue with a completely fresh one
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	AUTOFILL_STATION(payload) {
		return new Promise((resolve, reject) => {
			const { stationId, ignoreExistingQueue } = payload;
			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_STATION_PLAYLIST", { stationId, includeSongs: true }, this)
							.then(response => {
								next(null, response.playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						StationsModule.runJob("GET_STATION", { stationId }, this)
							.then(station => {
								if (!station.autofill.enabled) return next("Autofill is disabled in this station");
								if (
									!ignoreExistingQueue &&
									station.autofill.limit <= station.queue.filter(song => !song.requestedBy).length
								)
									return next("Autofill limit reached");

								if (ignoreExistingQueue) station.queue = [];

								return next(null, playlist, station);
							})
							.catch(next);
					},

					(playlist, station, next) => {
						if (station.autofill.mode === "random") {
							UtilsModule.runJob("SHUFFLE", { array: playlist.songs }, this)
								.then(response => {
									next(null, response.array, station);
								})
								.catch(next);
						} else next(null, playlist.songs, station);
					},

					(_playlistSongs, station, next) => {
						let playlistSongs = JSON.parse(JSON.stringify(_playlistSongs));
						if (station.autofill.mode === "sequential") {
							if (station.currentSongIndex <= playlistSongs.length) {
								const songsToAddToEnd = playlistSongs.splice(0, station.currentSongIndex);
								playlistSongs = [...playlistSongs, ...songsToAddToEnd];
							}
						}
						const currentRequests = station.queue.filter(song => !song.requestedBy).length;
						const songsStillNeeded = station.autofill.limit - currentRequests;
						const currentSongs = station.queue;
						const currentYoutubeIds = station.queue.map(song => song.youtubeId);
						const songsToAdd = [];
						let lastSongAdded = null;

						if (station.currentSong && station.currentSong.youtubeId)
							currentYoutubeIds.push(station.currentSong.youtubeId);

						playlistSongs.every(song => {
							if (
								songsToAdd.length < songsStillNeeded &&
								currentYoutubeIds.indexOf(song.youtubeId) === -1
							) {
								lastSongAdded = song;
								songsToAdd.push(song);
								return true;
							}
							if (songsToAdd.length >= songsStillNeeded) return false;
							return true;
						});

						let { currentSongIndex } = station;

						if (station.autofill.mode === "sequential" && lastSongAdded) {
							const indexOfLastSong = _playlistSongs
								.map(song => song.youtubeId)
								.indexOf(lastSongAdded.youtubeId);

							if (indexOfLastSong !== -1) currentSongIndex = indexOfLastSong;
						}

						next(null, currentSongs, songsToAdd, currentSongIndex);
					},

					(currentSongs, songsToAdd, currentSongIndex, next) => {
						SongsModule.runJob("GET_SONGS", {
							songIds: songsToAdd.map(song => song._id),
							properties: [
								"youtubeId",
								"title",
								"duration",
								"skipDuration",
								"artists",
								"thumbnail",
								"verified"
							]
						})
							.then(response => {
								const newSongsToAdd = songsToAdd.map(song =>
									response.songs.find(newSong => newSong._id.toString() === song._id.toString())
								);
								next(null, currentSongs, newSongsToAdd, currentSongIndex);
							})
							.catch(err => next(err));
					},

					(currentSongs, songsToAdd, currentSongIndex, next) => {
						const newPlaylist = [...currentSongs, ...songsToAdd].map(song => {
							if (!song._id) song._id = null;
							song.requestedAt = Date.now();
							return song;
						});
						next(null, newPlaylist, currentSongIndex);
					},

					(newPlaylist, currentSongIndex, next) => {
						StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $set: { queue: newPlaylist, currentSongIndex } },
							{ runValidators: true },
							err => {
								if (err) next(err);
								else
									StationsModule.runJob(
										"UPDATE_STATION",
										{
											stationId
										},
										this
									)
										.then(() => {
											next(null);
										})
										.catch(next);
							}
						);
					}
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * Gets next station song
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_NEXT_STATION_SONG(payload) {
		return new Promise((resolve, reject) => {
			const { stationId } = payload;

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
						if (station.queue.length === 0) next("No songs available.");
						else {
							next(null, station.queue[0]);
						}
					},

					(queueSong, next) => {
						if (!queueSong._id) next(null, queueSong);
						else
							SongsModule.runJob("GET_SONG", { songId: queueSong._id }, this)
								.then(response => {
									const { song } = response;

									if (song) {
										const newSong = {
											_id: song._id,
											youtubeId: song.youtubeId,
											title: song.title,
											artists: song.artists,
											duration: song.duration,
											skipDuration: song.skipDuration,
											thumbnail: song.thumbnail,
											requestedAt: queueSong.requestedAt,
											requestedBy: queueSong.requestedBy,
											likes: song.likes,
											dislikes: song.dislikes,
											verified: song.verified
										};

										return next(null, newSong);
									}

									return next(null, song);
								})
								.catch(err => {
									next(err);
								});
					}
				],
				(err, song) => {
					if (err) console.log(33333, err, payload);
					if (err) reject(err);
					else resolve({ song });
				}
			);
		});
	}

	/**
	 * Removes first station queue song
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_FIRST_QUEUE_SONG(payload) {
		return new Promise((resolve, reject) => {
			const { stationId } = payload;

			async.waterfall(
				[
					next => {
						StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $pop: { queue: -1 } },
							{ runValidators: true },
							err => {
								if (err) next(err);
								else
									StationsModule.runJob(
										"UPDATE_STATION",
										{
											stationId
										},
										this
									)
										.then(() => {
											next(null);
										})
										.catch(next);
							}
						);
					}
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * Skips a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station to skip
	 * @param {string} payload.natural - whether to skip naturally or forcefully
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SKIP_STATION(payload) {
		return new Promise((resolve, reject) => {
			StationsModule.log("INFO", `Skipping station ${payload.stationId}.`);

			StationsModule.log("STATION_ISSUE", `SKIP_STATION_CB - Station ID: ${payload.stationId}.`);

			async.waterfall(
				[
					// Clears up any existing timers that would skip the station if the song ends
					next => {
						NotificationsModule.runJob("UNSCHEDULE", {
							name: `stations.nextSong?id=${payload.stationId}`
						})
							.then(() => {
								next();
							})
							.catch(next);
					},

					// Gets the station object
					next => {
						StationsModule.runJob(
							"GET_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(station => next(null, station))
							.catch(next);
					},

					(station, next) => {
						if (!station) return next("Station not found.");

						if (station.autofill.enabled)
							return StationsModule.runJob("AUTOFILL_STATION", { stationId: station._id }, this)
								.then(() => next(null, station))
								.catch(err => {
									if (
										err === "Autofill is disabled in this station" ||
										err === "Autofill limit reached"
									)
										return next(null, station);
									return next(err);
								});
						return next(null, station);
					},

					(station, next) => {
						StationsModule.runJob("GET_NEXT_STATION_SONG", { stationId: station._id }, this)
							.then(response => {
								StationsModule.runJob("REMOVE_FIRST_QUEUE_SONG", { stationId: station._id }, this)
									.then(() => {
										next(null, response.song, station);
									})
									.catch(next);
							})
							.catch(err => {
								if (err === "No songs available.") next(null, null, station);
								else next(err);
							});
					},

					(song, station, next) => {
						const $set = {};

						if (song === null) $set.currentSong = null;
						else {
							$set.currentSong = {
								_id: song._id,
								youtubeId: song.youtubeId,
								title: song.title,
								artists: song.artists,
								duration: song.duration,
								skipDuration: song.skipDuration,
								thumbnail: song.thumbnail,
								requestedAt: song.requestedAt,
								requestedBy: song.requestedBy,
								verified: song.verified
							};
						}

						$set.startedAt = Date.now();
						$set.timePaused = 0;
						if (station.paused) $set.pausedAt = Date.now();
						next(null, $set, song, station);
					},

					($set, song, station, next) => {
						StationsModule.stationModel.updateOne({ _id: station._id }, { $set }, err => {
							if (err) return next(err);

							return StationsModule.runJob("UPDATE_STATION", { stationId: station._id }, this)
								.then(station => {
									next(null, station, song);
								})
								.catch(next);
						});
					},

					(station, song, next) => {
						if (station.currentSong !== null && station.currentSong.youtubeId !== undefined) {
							station.currentSong.likes = song.likes;
							station.currentSong.dislikes = song.dislikes;
							station.currentSong.skipVotes = 0;
						}
						next(null, station);
					},

					(station, next) => {
						if (station.autofill.enabled)
							return StationsModule.runJob("AUTOFILL_STATION", { stationId: station._id }, this)
								.then(() => next(null, station))
								.catch(err => {
									if (
										err === "Autofill is disabled in this station" ||
										err === "Autofill limit reached"
									)
										return next(null, station);
									return next(err);
								});
						return next(null, station);
					},

					(station, next) =>
						StationsModule.runJob("UPDATE_STATION", { stationId: station._id }, this)
							.then(station => {
								CacheModule.runJob("PUB", {
									channel: "station.queueUpdate",
									value: payload.stationId
								})
									.then()
									.catch();
								next(null, station);
							})
							.catch(next)
				],
				async (err, station) => {
					if (err === "Autofill limit reached") return resolve({ station });

					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						StationsModule.log("ERROR", `Skipping station "${payload.stationId}" failed. "${err}"`);
						return reject(new Error(err));
					}

					// TODO Pub/Sub this

					const { currentSong } = station;

					WSModule.runJob("EMIT_TO_ROOM", {
						room: `station.${station._id}`,
						args: [
							"event:station.nextSong",
							{
								data: {
									currentSong,
									startedAt: station.startedAt,
									paused: station.paused,
									timePaused: 0,
									natural: payload.natural
								}
							}
						]
					});

					WSModule.runJob("EMIT_TO_ROOM", {
						room: `manage-station.${station._id}`,
						args: ["event:station.nextSong", { data: { stationId: station._id, currentSong } }]
					});

					if (station.privacy === "public")
						WSModule.runJob("EMIT_TO_ROOM", {
							room: "home",
							args: ["event:station.nextSong", { data: { stationId: station._id, currentSong } }]
						});
					else {
						const sockets = await WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: "home" }, this);

						sockets.forEach(async socketId => {
							const socket = await WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId });
							if (!socket) return;
							const { session } = socket;

							if (session.sessionId) {
								CacheModule.runJob("HGET", { table: "sessions", key: session.sessionId }).then(
									session => {
										if (session) {
											DBModule.runJob("GET_MODEL", { modelName: "user" }).then(userModel => {
												userModel.findOne({ _id: session.userId }, (err, user) => {
													if (!err && user) {
														if (user.role === "admin")
															socket.dispatch("event:station.nextSong", {
																data: {
																	stationId: station._id,
																	currentSong
																}
															});
														else if (
															station.type === "community" &&
															station.owner === session.userId
														)
															socket.dispatch("event:station.nextSong", {
																data: {
																	stationId: station._id,
																	currentSong
																}
															});
													}
												});
											});
										}
									}
								);
							}
						});
					}

					WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: `station.${station._id}` }).then(sockets => {
						if (station.currentSong !== null && station.currentSong.youtubeId !== undefined) {
							WSModule.runJob("SOCKETS_JOIN_SONG_ROOM", {
								sockets,
								room: `song.${station.currentSong.youtubeId}`
							});
							if (!station.paused) {
								NotificationsModule.runJob("SCHEDULE", {
									name: `stations.nextSong?id=${station._id}`,
									time: station.currentSong.duration * 1000,
									station
								});
							}
						} else WSModule.runJob("SOCKETS_LEAVE_SONG_ROOMS", { sockets });
					});

					return resolve({ station });
				}
			);
		});
	}

	/**
	 * Checks if a user can view/access a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.station - the station object of the station in question
	 * @param {string} payload.userId - the id of the user in question
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CAN_USER_VIEW_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (payload.station.privacy === "public" || payload.station.privacy === "unlisted")
							return next(true);
						if (!payload.userId) return next("Not allowed");

						return next();
					},

					next => {
						DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
							userModel.findOne({ _id: payload.userId }, next);
						});
					},

					(user, next) => {
						if (!user) return next("Not allowed");
						if (user.role === "admin" || payload.station.owner === payload.userId) return next(true);
						if (payload.station.type === "official") return next("Not allowed");

						return next("Not allowed");
					}
				],
				async errOrResult => {
					if (errOrResult !== true && errOrResult !== "Not allowed") {
						errOrResult = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: errOrResult
							},
							this
						);
						reject(new Error(errOrResult));
					} else {
						resolve(errOrResult === true);
					}
				}
			);
		});
	}

	/**
	 * Checks if a user has favorited a station or not
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.stationId - the id of the station in question
	 * @param {string} payload.userId - the id of the user in question
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	HAS_USER_FAVORITED_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(userModel => {
							userModel.findOne({ _id: payload.userId }, next);
						});
					},

					(user, next) => {
						if (!user) return next("User not found.");
						if (user.favoriteStations.indexOf(payload.stationId) !== -1) return next(null, true);
						return next(null, false);
					}
				],
				async (err, isStationFavorited) => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve(isStationFavorited);
				}
			);
		});
	}

	/**
	 * Returns a list of sockets in a room that can and can't know about a station
	 *
	 * @param {object} payload - the payload object
	 * @param {object} payload.station - the station object
	 * @param {string} payload.room - the websockets room to get the sockets from
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION(payload) {
		return new Promise((resolve, reject) => {
			WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: payload.room }, this)
				.then(socketIds => {
					const sockets = [];
					async.eachLimit(
						socketIds,
						1,
						(socketId, next) => {
							WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this)
								.then(socket => {
									if (socket) sockets.push(socket);
									next();
								})
								.catch(err => {
									reject(err);
								});
						},
						err => {
							if (err) reject(err);
							else {
								let socketsThatCan = [];
								const socketsThatCannot = [];

								if (payload.station.privacy === "public") {
									socketsThatCan = sockets;
									resolve({ socketsThatCan, socketsThatCannot });
								} else {
									async.eachLimit(
										sockets,
										1,
										(socket, next) => {
											const { session } = socket;

											async.waterfall(
												[
													next => {
														if (!session.sessionId) next("No session id");
														else next();
													},

													next => {
														CacheModule.runJob(
															"HGET",
															{
																table: "sessions",
																key: session.sessionId
															},
															this
														)
															.then(response => {
																next(null, response);
															})
															.catch(next);
													},

													(session, next) => {
														if (!session) next("No session");
														else {
															DBModule.runJob("GET_MODEL", { modelName: "user" }, this)
																.then(userModel => {
																	next(null, userModel);
																})
																.catch(next);
														}
													},

													(userModel, next) => {
														if (!userModel) next("No user model");
														else
															userModel.findOne(
																{
																	_id: session.userId
																},
																next
															);
													},

													(user, next) => {
														if (!user) next("No user found");
														else if (user.role === "admin") {
															socketsThatCan.push(socket);
															next();
														} else if (
															payload.station.type === "community" &&
															payload.station.owner === session.userId
														) {
															socketsThatCan.push(socket);
															next();
														}
													}
												],
												err => {
													if (err) socketsThatCannot.push(socket);
													next();
												}
											);
										},
										err => {
											if (err) reject(err);
											else resolve({ socketsThatCan, socketsThatCannot });
										}
									);
								}
							}
						}
					);
				})
				.catch(reject);
		});
	}

	/**
	 * Adds a playlist to autofill a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.stationId - the id of the station
	 * @param {object} payload.playlistId - the id of the playlist
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	AUTOFILL_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!payload.stationId) next("Please specify a station id");
						else if (!payload.playlistId) next("Please specify a playlist id");
						else next();
					},

					next => {
						StationsModule.runJob("GET_STATION", { stationId: payload.stationId }, this)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},

					(station, next) => {
						if (station.playlist === payload.playlistId) next("You cannot autofill the station playlist");
						else if (station.autofill.playlists.indexOf(payload.playlistId) !== -1)
							next("This playlist is already autofilling");
						else if (station.blacklist.indexOf(payload.playlistId) !== -1)
							next("This playlist is currently blacklisted");
						else
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId: payload.playlistId }, this)
								.then(() => {
									next(null);
								})
								.catch(next);
					},

					next => {
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "station"
							},
							this
						).then(stationModel => {
							stationModel.updateOne(
								{ _id: payload.stationId },
								{ $push: { "autofill.playlists": payload.playlistId } },
								next
							);
						});
					},

					(res, next) => {
						StationsModule.runJob(
							"UPDATE_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(() => {
								next();
							})
							.catch(next);
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}

	/**
	 * Removes a playlist from autofill
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.stationId - the id of the station
	 * @param {object} payload.playlistId - the id of the playlist
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_AUTOFILL_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!payload.stationId) next("Please specify a station id");
						else if (!payload.playlistId) next("Please specify a playlist id");
						else next();
					},

					next => {
						StationsModule.runJob("GET_STATION", { stationId: payload.stationId }, this)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},

					(station, next) => {
						if (station.autofill.playlists.indexOf(payload.playlistId) === -1)
							next("This playlist isn't autofilling");
						else next();
					},

					next => {
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "station"
							},
							this
						).then(stationModel => {
							stationModel.updateOne(
								{ _id: payload.stationId },
								{ $pull: { "autofill.playlists": payload.playlistId } },
								next
							);
						});
					},

					(res, next) => {
						StationsModule.runJob(
							"UPDATE_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(() => {
								next();
							})
							.catch(next);
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}

	/**
	 * Add a playlist to station blacklist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.stationId - the id of the station
	 * @param {object} payload.playlistId - the id of the playlist
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	BLACKLIST_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!payload.stationId) next("Please specify a station id");
						else if (!payload.playlistId) next("Please specify a playlist id");
						else next();
					},

					next => {
						StationsModule.runJob("GET_STATION", { stationId: payload.stationId }, this)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},

					(station, next) => {
						if (station.playlist === payload.playlistId) next("You cannot blacklist the station playlist");
						else if (station.blacklist.indexOf(payload.playlistId) !== -1)
							next("This playlist is already blacklisted");
						else if (station.autofill.playlists.indexOf(payload.playlistId) !== -1)
							next(
								"This playlist is currently autofilling, please remove it from there before blacklisting it"
							);
						else
							PlaylistsModule.runJob("GET_PLAYLIST", { playlistId: payload.playlistId }, this)
								.then(() => {
									next(null);
								})
								.catch(next);
					},

					next => {
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "station"
							},
							this
						).then(stationModel => {
							stationModel.updateOne(
								{ _id: payload.stationId },
								{ $push: { blacklist: payload.playlistId } },
								next
							);
						});
					},

					(res, next) => {
						StationsModule.runJob(
							"UPDATE_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(() => {
								next();
							})
							.catch(next);
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}

	/**
	 * Remove a playlist from station blacklist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.stationId - the id of the station
	 * @param {object} payload.playlistId - the id of the playlist
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_BLACKLISTED_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!payload.stationId) next("Please specify a station id");
						else if (!payload.playlistId) next("Please specify a playlist id");
						else next();
					},

					next => {
						StationsModule.runJob("GET_STATION", { stationId: payload.stationId }, this)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},

					(station, next) => {
						if (station.blacklist.indexOf(payload.playlistId) === -1)
							next("This playlist isn't blacklisted");
						else next();
					},

					next => {
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "station"
							},
							this
						).then(stationModel => {
							stationModel.updateOne(
								{ _id: payload.stationId },
								{ $pull: { blacklist: payload.playlistId } },
								next
							);
						});
					},

					(res, next) => {
						StationsModule.runJob(
							"UPDATE_STATION",
							{
								stationId: payload.stationId
							},
							this
						)
							.then(() => {
								next();
							})
							.catch(next);
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}

	/**
	 * Removes autofilled or blacklisted playlist from a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REMOVE_AUTOFILLED_OR_BLACKLISTED_PLAYLIST_FROM_STATIONS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!payload.playlistId) next("Please specify a playlist id");
						else next();
					},

					next => {
						StationsModule.stationModel.updateMany(
							{
								$or: [{ "autofill.playlists": payload.playlistId }, { blacklist: payload.playlistId }]
							},
							{
								$pull: {
									"autofill.playlists": payload.playlistId,
									blacklist: payload.playlistId
								}
							},
							err => {
								if (err) next(err);
								else next();
							}
						);
					}
				],
				async err => {
					if (err && err !== true) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
						return reject(new Error(err));
					}

					return resolve();
				}
			);
		});
	}

	/**
	 * Gets stations that autofill or blacklist a specific playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			DBModule.runJob(
				"GET_MODEL",
				{
					modelName: "station"
				},
				this
			).then(stationModel => {
				stationModel.find(
					{
						$or: [{ "autofill.playlists": payload.playlistId }, { blacklist: payload.playlistId }]
					},
					(err, stations) => {
						if (err) reject(err);
						else resolve({ stationIds: stations.map(station => station._id) });
					}
				);
			});
		});
	}

	/**
	 * Clears every queue
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CLEAR_EVERY_STATION_QUEUE() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						StationsModule.stationModel.updateMany({}, { $set: { queue: [] } }, err => {
							if (err) next(err);
							else {
								StationsModule.stationModel.find({}, (err, stations) => {
									if (err) next(err);
									else {
										async.eachLimit(
											stations,
											1,
											(station, next) => {
												StationsModule.runJob("UPDATE_STATION", {
													stationId: station._id
												})
													.then(() => next())
													.catch(next);
												CacheModule.runJob("PUB", {
													channel: "station.queueUpdate",
													value: station._id
												})
													.then()
													.catch();
											},
											next
										);
									}
								});
							}
						});
					}
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * Resets a station queue
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	RESET_QUEUE(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						StationsModule.runJob(
							"AUTOFILL_STATION",
							{ stationId: payload.stationId, ignoreExistingQueue: true },
							this
						)
							.then(() => {
								CacheModule.runJob("PUB", {
									channel: "station.queueUpdate",
									value: payload.stationId
								})
									.then()
									.catch();
								next();
							})
							.catch(err => {
								if (err === "Autofill is disabled in this station" || err === "Autofill limit reached")
									StationsModule.stationModel
										.updateOne({ _id: payload.stationId }, { $set: { queue: [] } }, this)
										.then(() => next())
										.catch(next);
								else next(err);
							});
					},

					next => {
						StationsModule.runJob("UPDATE_STATION", { stationId: payload.stationId }, this)
							.then(() => next())
							.catch(next);
					},

					next => {
						CacheModule.runJob("PUB", {
							channel: "station.queueUpdate",
							value: payload.stationId
						})
							.then(() => next())
							.catch(next);
					}
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}
}

export default new _StationsModule();
