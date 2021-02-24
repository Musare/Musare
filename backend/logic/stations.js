import async from "async";

import CoreClass from "../core";

let StationsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let IOModule;
let SongsModule;
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
		IOModule = this.moduleManager.modules.io;
		SongsModule = this.moduleManager.modules.songs;
		NotificationsModule = this.moduleManager.modules.notifications;

		this.defaultSong = {
			songId: "60ItHLz5WEA",
			title: "Faded - Alan Walker",
			duration: 212,
			skipDuration: 0,
			likes: -1,
			dislikes: -1,
			requestedAt: Date.now()
		};

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
				});
			}
		});

		CacheModule.runJob("SUB", {
			channel: "station.newOfficialPlaylist",
			cb: async stationId => {
				CacheModule.runJob("HGET", {
					table: "officialPlaylists",
					key: stationId
				}).then(playlistObj => {
					if (playlistObj) {
						IOModule.runJob("EMIT_TO_ROOM", {
							room: `station.${stationId}`,
							args: ["event:newOfficialPlaylist", playlistObj.songs]
						});
					}
				});
			}
		});

		const stationModel = (this.stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }));
		const stationSchema = (this.stationSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "station" }));

		return new Promise((resolve, reject) =>
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
			)
		);
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
			// if (typeof cb !== 'function') cb = ()=>{};

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
											stationId: station._id
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
									stationId: station._id
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
									stationId: station._id
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
	 * Calculates the next song for the station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.station - station object to calculate song for
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async CALCULATE_SONG_FOR_STATION(payload) {
		// station, bypassValidate = false
		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" }, this);

		return new Promise((resolve, reject) => {
			const songList = [];

			return async.waterfall(
				[
					next => {
						if (payload.station.genres.length === 0) return next();

						const genresDone = [];
						const blacklistedGenres = payload.station.blacklistedGenres.map(blacklistedGenre =>
							blacklistedGenre.toLowerCase()
						);

						return payload.station.genres.forEach(genre => {
							songModel.find({ genres: { $regex: genre, $options: "i" } }, (err, songs) => {
								if (!err) {
									songs.forEach(song => {
										if (songList.indexOf(song._id) === -1) {
											let found = false;
											song.genres.forEach(songGenre => {
												if (blacklistedGenres.indexOf(songGenre.toLowerCase()) !== -1)
													found = true;
											});
											if (!found) {
												songList.push(song._id);
											}
										}
									});
								}
								genresDone.push(genre);
								if (genresDone.length === payload.station.genres.length) next();
							});
						});
					},

					next => {
						const playlist = [];
						songList.forEach(songId => {
							if (payload.station.playlist.indexOf(songId) === -1) playlist.push(songId);
						});

						// eslint-disable-next-line array-callback-return
						payload.station.playlist.filter(songId => {
							if (songList.indexOf(songId) !== -1) playlist.push(songId);
						});

						UtilsModule.runJob("SHUFFLE", { array: playlist })
							.then(result => {
								next(null, result.array);
							}, this)
							.catch(next);
					},

					(playlist, next) => {
						StationsModule.runJob(
							"CALCULATE_OFFICIAL_PLAYLIST_LIST",
							{
								stationId: payload.station._id,
								songList: playlist
							},
							this
						)
							.then(() => {
								next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						StationsModule.stationModel.updateOne(
							{ _id: payload.station._id },
							{ $set: { playlist } },
							{ runValidators: true },
							() => {
								StationsModule.runJob(
									"UPDATE_STATION",
									{
										stationId: payload.station._id
									},
									this
								)
									.then(() => {
										next(null, playlist);
									})
									.catch(next);
							}
						);
					}
				],
				(err, newPlaylist) => {
					if (err) return reject(new Error(err));
					return resolve(newPlaylist);
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
							if (station.type === "official") {
								StationsModule.runJob("CALCULATE_OFFICIAL_PLAYLIST_LIST", {
									stationId: station._id,
									songList: station.playlist
								})
									.then()
									.catch();
							}
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
		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						StationsModule.stationModel.findOne({ name: payload.stationName }, next);
					},

					(station, next) => {
						if (station) {
							if (station.type === "official") {
								StationsModule.runJob("CALCULATE_OFFICIAL_PLAYLIST_LIST", {
									stationId: station._id,
									songList: station.playlist
								});
							}
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
			)
		);
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
	 * Creates the official playlist for a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station
	 * @param {Array} payload.songList - list of songs to put in official playlist
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async CALCULATE_OFFICIAL_PLAYLIST_LIST(payload) {
		const officialPlaylistSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "officialPlaylist" }, this);

		console.log(typeof payload.songList, payload.songList);

		return new Promise(resolve => {
			const lessInfoPlaylist = [];

			return async.each(
				payload.songList,
				(song, next) => {
					SongsModule.runJob("GET_SONG", { id: song }, this)
						.then(response => {
							const { song } = response;
							if (song) {
								const newSong = {
									_id: song._id,
									songId: song.songId,
									title: song.title,
									artists: song.artists,
									duration: song.duration,
									thumbnail: song.thumbnail,
									requestedAt: song.requestedAt
								};
								lessInfoPlaylist.push(newSong);
							}
						})
						.finally(() => {
							next();
						});
				},
				() => {
					CacheModule.runJob(
						"HSET",
						{
							table: "officialPlaylists",
							key: payload.stationId,
							value: officialPlaylistSchema(payload.stationId, lessInfoPlaylist)
						},
						this
					).finally(() => {
						CacheModule.runJob("PUB", {
							channel: "station.newOfficialPlaylist",
							value: payload.stationId
						});
						resolve();
					});
				}
			);
		});
	}

	/**
	 * Skips a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station to skip
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SKIP_STATION(payload) {
		return new Promise((resolve, reject) => {
			StationsModule.log("INFO", `Skipping station ${payload.stationId}.`);

			StationsModule.log("STATION_ISSUE", `SKIP_STATION_CB - Station ID: ${payload.stationId}.`);

			async.waterfall(
				[
					next => {
						NotificationsModule.runJob("UNSCHEDULE", {
							name: `stations.nextSong?id=${payload.stationId}`
						})
							.then(() => {
								next();
							})
							.catch(next);
					},

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
							.catch(() => {});
					},
					// eslint-disable-next-line consistent-return
					(station, next) => {
						if (!station) return next("Station not found.");

						if (station.type === "community" && station.partyMode && station.queue.length === 0)
							return next(null, null, -11, station); // Community station with party mode enabled and no songs in the queue

						if (station.type === "community" && station.partyMode && station.queue.length > 0) {
							// Community station with party mode enabled and songs in the queue
							if (station.paused) return next(null, null, -19, station);

							return StationsModule.stationModel.updateOne(
								{ _id: payload.stationId },
								{
									$pull: {
										queue: {
											_id: station.queue[0]._id
										}
									}
								},
								err => {
									if (err) return next(err);
									return next(null, station.queue[0], -12, station);
								}
							);
						}

						if (station.type === "community" && !station.partyMode) {
							return DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this).then(playlistModel =>
								playlistModel.findOne({ _id: station.privatePlaylist }, (err, playlist) => {
									if (err) return next(err);

									if (!playlist) return next(null, null, -13, station);

									playlist = playlist.songs;

									if (playlist.length > 0) {
										let currentSongIndex;

										if (station.currentSongIndex < playlist.length - 1)
											currentSongIndex = station.currentSongIndex + 1;
										else currentSongIndex = 0;

										const callback = (err, song) => {
											if (err) return next(err);
											if (song) return next(null, song, currentSongIndex, station);

											const currentSong = {
												songId: playlist[currentSongIndex].songId,
												title: playlist[currentSongIndex].title,
												duration: playlist[currentSongIndex].duration,
												likes: -1,
												dislikes: -1,
												requestedAt: playlist[currentSongIndex].requestedAt
											};

											return next(null, currentSong, currentSongIndex, station);
										};

										if (playlist[currentSongIndex]._id)
											return SongsModule.runJob(
												"GET_SONG",
												{
													id: playlist[currentSongIndex]._id
												},
												this
											)
												.then(response => callback(null, response.song))
												.catch(callback);
										return SongsModule.runJob(
											"GET_SONG_FROM_ID",
											{
												songId: playlist[currentSongIndex].songId
											},
											this
										)
											.then(response => callback(null, response.song))
											.catch(callback);
									}

									return next(null, null, -14, station);
								})
							);
						}

						if (station.type === "official" && station.playlist.length === 0) {
							return StationsModule.runJob("CALCULATE_SONG_FOR_STATION", { station }, this)
								.then(playlist => {
									if (playlist.length === 0)
										return next(null, StationsModule.defaultSong, 0, station);

									return SongsModule.runJob(
										"GET_SONG",
										{
											id: playlist[0]
										},
										this
									)
										.then(response => {
											next(null, response.song, 0, station);
										})
										.catch(() => next(null, StationsModule.defaultSong, 0, station));
								})
								.catch(err => {
									next(err);
								});
						}

						if (station.type === "official" && station.playlist.length > 0) {
							return async.doUntil(
								next => {
									if (station.currentSongIndex < station.playlist.length - 1) {
										SongsModule.runJob(
											"GET_SONG",
											{
												id: station.playlist[station.currentSongIndex + 1]
											},
											this
										)
											.then(response => next(null, response.song, station.currentSongIndex + 1))
											.catch(() => {
												station.currentSongIndex += 1;
												next(null, null, null);
											});
									} else {
										StationsModule.runJob(
											"CALCULATE_SONG_FOR_STATION",
											{
												station
											},
											this
										)
											.then(newPlaylist => {
												SongsModule.runJob("GET_SONG", { id: newPlaylist[0] }, this)
													.then(response => {
														station.playlist = newPlaylist;
														next(null, response.song, 0);
													})
													.catch(() => next(null, StationsModule.defaultSong, 0));
											})
											.catch(() => {
												next(null, StationsModule.defaultSong, 0);
											});
									}
								},
								(song, currentSongIndex, next) => {
									if (song) return next(null, true, currentSongIndex);
									return next(null, false);
								},
								(err, song, currentSongIndex) => next(err, song, currentSongIndex, station)
							);
						}
					},
					(song, currentSongIndex, station, next) => {
						const $set = {};
						if (song === null) $set.currentSong = null;
						else if (song.likes === -1 && song.dislikes === -1) {
							$set.currentSong = {
								songId: song.songId,
								title: song.title,
								duration: song.duration,
								skipDuration: 0,
								likes: -1,
								dislikes: -1,
								requestedAt: song.requestedAt
							};
						} else {
							$set.currentSong = {
								_id: song._id,
								songId: song.songId,
								title: song.title,
								artists: song.artists,
								duration: song.duration,
								likes: song.likes,
								dislikes: song.dislikes,
								skipDuration: song.skipDuration,
								thumbnail: song.thumbnail,
								requestedAt: song.requestedAt
							};
						}

						if (currentSongIndex >= 0) $set.currentSongIndex = currentSongIndex;
						$set.startedAt = Date.now();
						$set.timePaused = 0;
						if (station.paused) $set.pausedAt = Date.now();
						next(null, $set, station);
					},

					($set, station, next) => {
						StationsModule.stationModel.updateOne({ _id: station._id }, { $set }, err => {
							if (err) return next(err);

							return StationsModule.runJob(
								"UPDATE_STATION",
								{
									stationId: station._id
								},
								this
							)
								.then(station => {
									if (station.type === "community" && station.partyMode === true)
										CacheModule.runJob("PUB", {
											channel: "station.queueUpdate",
											value: payload.stationId
										})
											.then()
											.catch();
									next(null, station);
								})
								.catch(next);
						});
					}
				],
				async (err, station) => {
					if (err) {
						err = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						StationsModule.log("ERROR", `Skipping station "${payload.stationId}" failed. "${err}"`);
						reject(new Error(err));
					} else {
						if (station.currentSong !== null && station.currentSong.songId !== undefined) {
							station.currentSong.skipVotes = 0;
						}
						// TODO Pub/Sub this

						IOModule.runJob("EMIT_TO_ROOM", {
							room: `station.${station._id}`,
							args: [
								"event:songs.next",
								{
									currentSong: station.currentSong,
									startedAt: station.startedAt,
									paused: station.paused,
									timePaused: 0
								}
							]
						})
							.then()
							.catch();

						if (station.privacy === "public") {
							IOModule.runJob("EMIT_TO_ROOM", {
								room: "home",
								args: ["event:station.nextSong", station._id, station.currentSong]
							})
								.then()
								.catch();
						} else {
							const sockets = await IOModule.runJob("GET_ROOM_SOCKETS", { room: "home" }, this);

							Object.keys(sockets).forEach(socketKey => {
								const socket = sockets[socketKey];
								const { session } = socket;
								if (session.sessionId) {
									CacheModule.runJob(
										"HGET",
										{
											table: "sessions",
											key: session.sessionId
										},
										this
										// eslint-disable-next-line no-loop-func
									).then(session => {
										if (session) {
											DBModule.runJob("GET_MODEL", { modelName: "user" }, this).then(
												userModel => {
													userModel.findOne(
														{
															_id: session.userId
														},
														(err, user) => {
															if (!err && user) {
																if (user.role === "admin")
																	socket.emit(
																		"event:station.nextSong",
																		station._id,
																		station.currentSong
																	);
																else if (
																	station.type === "community" &&
																	station.owner === session.userId
																)
																	socket.emit(
																		"event:station.nextSong",
																		station._id,
																		station.currentSong
																	);
															}
														}
													);
												}
											);
										}
									});
								}
							});
						}

						if (station.currentSong !== null && station.currentSong.songId !== undefined) {
							IOModule.runJob("SOCKETS_JOIN_SONG_ROOM", {
								sockets: await IOModule.runJob(
									"GET_ROOM_SOCKETS",
									{
										room: `station.${station._id}`
									},
									this
								),
								room: `song.${station.currentSong.songId}`
							});
							if (!station.paused) {
								NotificationsModule.runJob("SCHEDULE", {
									name: `stations.nextSong?id=${station._id}`,
									time: station.currentSong.duration * 1000,
									station
								});
							}
						} else {
							IOModule.runJob("SOCKETS_LEAVE_SONG_ROOMS", {
								sockets: await IOModule.runJob(
									"GET_ROOM_SOCKETS",
									{
										room: `station.${station._id}`
									},
									this
								)
							})
								.then()
								.catch();
						}

						resolve({ station });
					}
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
	 * @param {boolean} payload.hideUnlisted - whether the user is allowed to see unlisted stations or not
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CAN_USER_VIEW_STATION(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (payload.station.privacy === "public") return next(true);
						if (payload.station.privacy === "unlisted")
							if (payload.hideUnlisted === true) return next();
							else return next(true);
						if (!payload.userId) return next("Not allowed");

						return next();
					},

					next => {
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "user"
							},
							this
						).then(userModel => {
							userModel.findOne({ _id: payload.userId }, next);
						});
					},

					(user, next) => {
						if (!user) return next("Not allowed");
						if (user.role === "admin") return next(true);
						if (payload.station.type === "official") return next("Not allowed");
						if (payload.station.owner === payload.userId) return next(true);

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
						DBModule.runJob(
							"GET_MODEL",
							{
								modelName: "user"
							},
							this
						).then(userModel => {
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
	 * @param {string} payload.room - the socket.io room to get the sockets from
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SOCKETS_THAT_CAN_KNOW_ABOUT_STATION(payload) {
		return new Promise((resolve, reject) => {
			IOModule.runJob("GET_ROOM_SOCKETS", { room: payload.room }, this)
				.then(socketsObject => {
					const sockets = Object.keys(socketsObject).map(socketKey => socketsObject[socketKey]);
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
				})
				.catch(reject);
		});
	}
}

export default new _StationsModule();
