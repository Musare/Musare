import async from "async";

import CoreClass from "../core";

class StationsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("stations");
	}

	/**
	 * Initialises the stations module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.cache = this.moduleManager.modules.cache;
		this.db = this.moduleManager.modules.db;
		this.utils = this.moduleManager.modules.utils;
		this.songs = this.moduleManager.modules.songs;
		this.notifications = this.moduleManager.modules.notifications;

		this.defaultSong = {
			songId: "60ItHLz5WEA",
			title: "Faded - Alan Walker",
			duration: 212,
			skipDuration: 0,
			likes: -1,
			dislikes: -1
		};

		// TEMP
		this.cache.runJob("SUB", {
			channel: "station.pause",
			cb: async stationId => {
				this.notifications
					.runJob("REMOVE", {
						subscription: `stations.nextSong?id=${stationId}`
					})
					.then();
			}
		});

		this.cache.runJob("SUB", {
			channel: "station.resume",
			cb: async stationId => {
				this.runJob("INITIALIZE_STATION", { stationId }).then();
			}
		});

		this.cache.runJob("SUB", {
			channel: "station.queueUpdate",
			cb: async stationId => {
				this.runJob("GET_STATION", { stationId }).then(station => {
					if (!station.currentSong && station.queue.length > 0) {
						this.runJob("INITIALIZE_STATION", {
							stationId
						}).then();
					}
				});
			}
		});

		this.cache.runJob("SUB", {
			channel: "station.newOfficialPlaylist",
			cb: async stationId => {
				this.cache
					.runJob("HGET", {
						table: "officialPlaylists",
						key: stationId
					})
					.then(playlistObj => {
						if (playlistObj) {
							this.utils.runJob("EMIT_TO_ROOM", {
								room: `station.${stationId}`,
								args: ["event:newOfficialPlaylist", playlistObj.songs]
							});
						}
					});
			}
		});

		const stationModel = (this.stationModel = await this.db.runJob("GET_MODEL", { modelName: "station" }));
		const stationSchema = (this.stationSchema = await this.cache.runJob("GET_SCHEMA", { schemaName: "station" }));

		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						this.setStage(2);
						this.cache
							.runJob("HGETALL", { table: "stations" })
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
										this.cache
											.runJob("HDEL", {
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
											this.cache
												.runJob("HSET", {
													table: "stations",
													key: station._id,
													value: stationSchema(station)
												})
												.then(station => next(null, station))
												.catch(next);
										},

										(station, next) => {
											this.runJob(
												"INITIALIZE_STATION",
												{
													stationId: station._id,
													bypassQueue: true
												},
												{ bypassQueue: true }
											)
												.then(() => {
													next();
												})
												.catch(next); // bypassQueue is true because otherwise the module will never initialize
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
						err = await this.utils.runJob("GET_ERROR", {
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
	 * @param {boolean} payload.bypassQueue - UNKNOWN
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	INITIALIZE_STATION(payload) {
		return new Promise((resolve, reject) => {
			// if (typeof cb !== 'function') cb = ()=>{};

			async.waterfall(
				[
					next => {
						this.runJob(
							"GET_STATION",
							{
								stationId: payload.stationId,
								bypassQueue: payload.bypassQueue
							},
							{ bypassQueue: payload.bypassQueue }
						)
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},
					(station, next) => {
						if (!station) return next("Station not found.");

						this.notifications
							.runJob("UNSCHEDULE", {
								name: `stations.nextSong?id=${station._id}`
							})
							.then()
							.catch();

						this.notifications
							.runJob("SUBSCRIBE", {
								name: `stations.nextSong?id=${station._id}`,
								cb: () =>
									this.runJob("SKIP_STATION", {
										stationId: station._id
									}),
								unique: true,
								station
							})
							.then()
							.catch();

						if (station.paused) return next(true, station);

						return next(null, station);
					},
					(station, next) => {
						if (!station.currentSong) {
							return this.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									bypassQueue: payload.bypassQueue
								},
								{ bypassQueue: payload.bypassQueue }
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
							return this.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									bypassQueue: payload.bypassQueue
								},
								{ bypassQueue: payload.bypassQueue }
							)
								.then(station => {
									next(null, station);
								})
								.catch(next);
						}
						// name, time, cb, station
						this.notifications.runJob("SCHEDULE", {
							name: `stations.nextSong?id=${station._id}`,
							time: timeLeft,
							station
						});

						return next(null, station);
					}
				],
				async (err, station) => {
					if (err && err !== true) {
						err = await this.utils.runJob("GET_ERROR", {
							error: err
						});
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
	 * @param {boolean} payload.bypassQueue - UNKNOWN
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async CALCULATE_SONG_FOR_STATION(payload) {
		// station, bypassValidate = false
		const stationModel = await this.db.runJob("GET_MODEL", { modelName: "station" });
		const songModel = await this.db.runJob("GET_MODEL", { modelName: "song" });

		return new Promise((resolve, reject) => {
			const songList = [];

			return async.waterfall(
				[
					next => {
						if (payload.station.genres.length === 0) return next();

						const genresDone = [];

						return payload.station.genres.forEach(genre => {
							songModel.find({ genres: genre }, (err, songs) => {
								if (!err) {
									songs.forEach(song => {
										if (songList.indexOf(song._id) === -1) {
											let found = false;
											song.genres.forEach(songGenre => {
												if (payload.station.blacklistedGenres.indexOf(songGenre) !== -1)
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

						this.utils
							.runJob("SHUFFLE", { array: playlist })
							.then(result => {
								next(null, result.array);
							})
							.catch(next);
					},

					(playlist, next) => {
						this.runJob(
							"CALCULATE_OFFICIAL_PLAYLIST_LIST",
							{
								stationId: payload.station._id,
								songList: playlist,
								bypassQueue: payload.bypassQueue
							},
							{ bypassQueue: payload.bypassQueue }
						)
							.then(() => {
								next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						stationModel.updateOne(
							{ _id: payload.station._id },
							{ $set: { playlist } },
							{ runValidators: true },
							() => {
								this.runJob(
									"UPDATE_STATION",
									{
										stationId: payload.station._id,
										bypassQueue: payload.bypassQueue
									},
									{ bypassQueue: payload.bypassQueue }
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
						this.cache
							.runJob("HGET", {
								table: "stations",
								key: payload.stationId
							})
							.then(station => {
								next(null, station);
							})
							.catch(next);
					},

					(station, next) => {
						if (station) return next(true, station);
						return this.stationModel.findOne({ _id: payload.stationId }, next);
					},

					(station, next) => {
						if (station) {
							if (station.type === "official") {
								this.runJob("CALCULATE_OFFICIAL_PLAYLIST_LIST", {
									stationId: station._id,
									songList: station.playlist
								})
									.then()
									.catch();
							}
							station = this.stationSchema(station);
							this.cache
								.runJob("HSET", {
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
						err = await this.utils.runJob("GET_ERROR", {
							error: err
						});
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
		const stationModel = await this.db.runJob("GET_MODEL", { modelName: "station" });

		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						stationModel.findOne({ name: payload.stationName }, next);
					},

					(station, next) => {
						if (station) {
							if (station.type === "official") {
								this.runJob("CALCULATE_OFFICIAL_PLAYLIST_LIST", {
									stationId: station._id,
									songList: station.playlist
								});
							}
							this.cache.runJob("GET_SCHEMA", { schemaName: "station" }).then(stationSchema => {
								station = stationSchema(station);
								this.cache.runJob("HSET", {
									table: "stations",
									key: station._id,
									value: station
								});
								next(true, station);
							});
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
						this.stationModel.findOne({ _id: payload.stationId }, next);
					},

					(station, next) => {
						if (!station) {
							this.cache
								.runJob("HDEL", {
									table: "stations",
									key: payload.stationId
								})
								.then()
								.catch();
							return next("Station not found");
						}

						return this.cache
							.runJob("HSET", {
								table: "stations",
								key: payload.stationId,
								value: station
							})
							.then(station => {
								next(null, station);
							})
							.catch(next);
					}
				],
				async (err, station) => {
					if (err && err !== true) {
						err = await this.utils.runJob("GET_ERROR", {
							error: err
						});
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
		const officialPlaylistSchema = await this.cache.runJob("GET_SCHEMA", { schemaName: "officialPlaylist" });

		console.log(typeof payload.songList, payload.songList);

		return new Promise(resolve => {
			const lessInfoPlaylist = [];

			return async.each(
				payload.songList,
				(song, next) => {
					this.songs
						.runJob("GET_SONG", { id: song })
						.then(response => {
							const { song } = response;
							if (song) {
								const newSong = {
									songId: song.songId,
									title: song.title,
									artists: song.artists,
									duration: song.duration
								};
								lessInfoPlaylist.push(newSong);
							}
						})
						.finally(() => {
							next();
						});
				},
				() => {
					this.cache
						.runJob("HSET", {
							table: "officialPlaylists",
							key: payload.stationId,
							value: officialPlaylistSchema(payload.stationId, lessInfoPlaylist)
						})
						.finally(() => {
							this.cache.runJob("PUB", {
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
	 * @param {boolean} payload.bypassQueue - UNKNOWN
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SKIP_STATION(payload) {
		return new Promise((resolve, reject) => {
			this.log("INFO", `Skipping station ${payload.stationId}.`);

			this.log("STATION_ISSUE", `SKIP_STATION_CB - Station ID: ${payload.stationId}.`);

			async.waterfall(
				[
					next => {
						this.runJob(
							"GET_STATION",
							{
								stationId: payload.stationId,
								bypassQueue: payload.bypassQueue
							},
							{ bypassQueue: payload.bypassQueue }
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

							return this.stationModel.updateOne(
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
							return this.db.runJob("GET_MODEL", { modelName: "playlist" }).then(playlistModel =>
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
												dislikes: -1
											};

											return next(null, currentSong, currentSongIndex, station);
										};

										if (playlist[currentSongIndex]._id)
											return this.songs
												.runJob("GET_SONG", {
													id: playlist[currentSongIndex]._id
												})
												.then(response => callback(null, response.song))
												.catch(callback);
										return this.songs
											.runJob("GET_SONG_FROM_ID", {
												songId: playlist[currentSongIndex].songId
											})
											.then(response => callback(null, response.song))
											.catch(callback);
									}

									return next(null, null, -14, station);
								})
							);
						}

						if (station.type === "official" && station.playlist.length === 0) {
							return this.runJob(
								"CALCULATE_SONG_FOR_STATION",
								{ station, bypassQueue: payload.bypassQueue },
								{ bypassQueue: payload.bypassQueue }
							)
								.then(playlist => {
									if (playlist.length === 0) return next(null, this.defaultSong, 0, station);

									return this.songs
										.runJob("GET_SONG", {
											id: playlist[0]
										})
										.then(response => {
											next(null, response.song, 0, station);
										})
										.catch(() => next(null, this.defaultSong, 0, station));
								})
								.catch(next);
						}

						if (station.type === "official" && station.playlist.length > 0) {
							return async.doUntil(
								next => {
									if (station.currentSongIndex < station.playlist.length - 1) {
										this.songs
											.runJob("GET_SONG", {
												id: station.playlist[station.currentSongIndex + 1]
											})
											.then(response => next(null, response.song, station.currentSongIndex + 1))
											.catch(() => {
												station.currentSongIndex += 1;
												next(null, null, null);
											});
									} else {
										this.runJob(
											"CALCULATE_SONG_FOR_STATION",
											{
												station,
												bypassQueue: payload.bypassQueue
											},
											{ bypassQueue: payload.bypassQueue }
										)
											.then(newPlaylist => {
												this.songs
													.runJob("GET_SONG", { id: newPlaylist[0] })
													.then(response => {
														station.playlist = newPlaylist;
														next(null, response.song, 0);
													})
													.catch(() => next(null, this.defaultSong, 0));
											})
											.catch(() => {
												next(null, this.defaultSong, 0);
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
								dislikes: -1
							};
						} else {
							$set.currentSong = {
								songId: song.songId,
								title: song.title,
								artists: song.artists,
								duration: song.duration,
								likes: song.likes,
								dislikes: song.dislikes,
								skipDuration: song.skipDuration,
								thumbnail: song.thumbnail
							};
						}
						if (currentSongIndex >= 0) $set.currentSongIndex = currentSongIndex;
						$set.startedAt = Date.now();
						$set.timePaused = 0;
						if (station.paused) $set.pausedAt = Date.now();
						next(null, $set, station);
					},

					($set, station, next) => {
						this.stationModel.updateOne({ _id: station._id }, { $set }, () => {
							this.runJob(
								"UPDATE_STATION",
								{
									stationId: station._id,
									bypassQueue: payload.bypassQueue
								},

								{ bypassQueue: payload.bypassQueue }
							)
								.then(station => {
									if (station.type === "community" && station.partyMode === true)
										this.cache
											.runJob("PUB", {
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
						err = await this.utils.runJob("GET_ERROR", {
							error: err
						});
						this.log("ERROR", `Skipping station "${payload.stationId}" failed. "${err}"`);
						reject(new Error(err));
					} else {
						if (station.currentSong !== null && station.currentSong.songId !== undefined) {
							station.currentSong.skipVotes = 0;
						}
						// TODO Pub/Sub this

						this.utils
							.runJob("EMIT_TO_ROOM", {
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
							this.utils
								.runJob("EMIT_TO_ROOM", {
									room: "home",
									args: ["event:station.nextSong", station._id, station.currentSong]
								})
								.then()
								.catch();
						} else {
							const sockets = await this.utils.runJob("GET_ROOM_SOCKETS", { room: "home" });

							for (
								let socketId = 0, socketKeys = Object.keys(sockets);
								socketId < socketKeys.length;
								socketId += 1
							) {
								const socket = sockets[socketId];
								const { session } = sockets[socketId];
								if (session.sessionId) {
									this.cache
										.runJob("HGET", {
											table: "sessions",
											key: session.sessionId
										})
										.then(session => {
											if (session) {
												this.db.runJob("GET_MODEL", { modelName: "user" }).then(userModel => {
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
												});
											}
										});
								}
							}
						}

						if (station.currentSong !== null && station.currentSong.songId !== undefined) {
							this.utils.runJob("SOCKETS_JOIN_SONG_ROOM", {
								sockets: await this.utils.runJob("GET_ROOM_SOCKETS", {
									room: `station.${station._id}`
								}),
								room: `song.${station.currentSong.songId}`
							});
							if (!station.paused) {
								this.notifications.runJob("SCHEDULE", {
									name: `stations.nextSong?id=${station._id}`,
									time: station.currentSong.duration * 1000,
									station
								});
							}
						} else {
							this.utils
								.runJob("SOCKETS_LEAVE_SONG_ROOMS", {
									sockets: await this.utils.runJob("GET_ROOM_SOCKETS", {
										room: `station.${station._id}`
									})
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
						this.db
							.runJob("GET_MODEL", {
								modelName: "user"
							})
							.then(userModel => {
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
						errOrResult = await this.utils.runJob("GET_ERROR", {
							error: errOrResult
						});
						reject(new Error(errOrResult));
					} else {
						resolve(errOrResult === true);
					}
				}
			);
		});
	}
}

export default new StationsModule();
