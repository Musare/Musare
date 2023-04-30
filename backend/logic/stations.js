import async from "async";
import config from "config";

import CoreClass from "../core";

import { hasPermission } from "./hooks/hasPermission";

let StationsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let WSModule;
let PlaylistsModule;
let NotificationsModule;
let MediaModule;
let SongsModule;

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
		PlaylistsModule = this.moduleManager.modules.playlists;
		NotificationsModule = this.moduleManager.modules.notifications;
		MediaModule = this.moduleManager.modules.media;
		SongsModule = this.moduleManager.modules.songs;

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

		const userModel = (this.userModel = await DBModule.runJob("GET_MODEL", { modelName: "user" }));

		CacheModule.runJob("SUB", {
			channel: "station.djs.added",
			cb: async ({ stationId, userId }) => {
				userModel.findOne({ _id: userId }, (err, user) => {
					if (!err && user) {
						const { _id, name, username, avatar } = user;
						const data = { data: { user: { _id, name, username, avatar }, stationId } };
						WSModule.runJob("EMIT_TO_ROOMS", {
							rooms: [`station.${stationId}`, "home"],
							args: ["event:station.djs.added", data]
						});
						WSModule.runJob("EMIT_TO_ROOM", {
							room: `manage-station.${stationId}`,
							args: ["event:manageStation.djs.added", data]
						});
					}
				});
			}
		});

		CacheModule.runJob("SUB", {
			channel: "station.djs.removed",
			cb: async ({ stationId, userId }) => {
				userModel.findOne({ _id: userId }, (err, user) => {
					if (!err && user) {
						const { _id, name, username, avatar } = user;
						const data = { data: { user: { _id, name, username, avatar }, stationId } };
						WSModule.runJob("EMIT_TO_ROOMS", {
							rooms: [`station.${stationId}`, "home"],
							args: ["event:station.djs.removed", data]
						});
						WSModule.runJob("EMIT_TO_ROOM", {
							room: `manage-station.${stationId}`,
							args: ["event:manageStation.djs.removed", data]
						});
					}
				});
			}
		});

		const stationModel = (this.stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }));
		const stationSchema = (this.stationSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "station" }));

		this.stationHistoryModel = await DBModule.runJob("GET_MODEL", {
			modelName: "stationHistory"
		});

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
						const mediaSources = [];
						if (!config.get("experimental.soundcloud")) {
							mediaSources.push(/^soundcloud:/);
						}
						if (!config.get("experimental.spotify")) {
							mediaSources.push(/^spotify:/);
						}
						if (mediaSources.length > 0)
							stationModel.updateMany(
								{},
								{ $pull: { queue: { mediaSource: { $in: mediaSources } } } },
								err => {
									if (err) next(err);
									else next();
								}
							);
						else next();
					},

					next => {
						this.setStage(5);
						stationModel.find({}, next);
					},

					(stations, next) => {
						this.setStage(6);
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
											natural: true,
											skipReason: "natural"
										}),
									unique: true,
									station
								})
									.then()
									.catch();

								return next(null, station);
							});
					},
					(station, next) => {
						// A current song is invalid if it isn't allowed to be played. Spotify songs can never be played, and SoundCloud songs can't be played if SoundCloud isn't enabled
						let currentSongIsInvalid = false;
						if (station.currentSong) {
							if (station.currentSong.mediaSource.startsWith("spotify:")) currentSongIsInvalid = true;
							if (
								station.currentSong.mediaSource.startsWith("soundcloud:") &&
								!config.get("experimental.soundcloud")
							)
								currentSongIsInvalid = true;
						}
						if (
							(!station.paused && !station.currentSong) ||
							(station.currentSong && currentSongIsInvalid)
						) {
							return StationsModule.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									natural: false,
									skipReason: "other"
								},
								this
							)
								.then(station => {
									next(null, station);
								})
								.catch(next)
								.finally(() => {});
						}

						if (station.paused) return next(null, station);

						let timeLeft =
							station.currentSong.duration * 1000 - (Date.now() - station.startedAt - station.timePaused);

						if (Number.isNaN(timeLeft)) timeLeft = -1;

						if (station.currentSong.duration * 1000 < timeLeft || timeLeft < 0) {
							return StationsModule.runJob(
								"SKIP_STATION",
								{
									stationId: station._id,
									natural: false,
									skipReason: "other"
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

					async (_playlistSongs, station) => {
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
						let currentMediaSources = station.queue.map(song => song.mediaSource);
						const songsToAdd = [];
						let lastSongAdded = null;

						if (station.currentSong && station.currentSong.mediaSource)
							currentMediaSources.push(station.currentSong.mediaSource);

						// Block for experiment: queue_autofill_skip_last_x_played
						if (config.has(`experimental.queue_autofill_skip_last_x_played.${stationId}`)) {
							const redisList = `experimental:queue_autofill_skip_last_x_played:${stationId}`;
							// Get list of last x youtube video's played, to make sure they can't be autofilled
							const listOfYoutubeIds = await CacheModule.runJob("LRANGE", { key: redisList }, this);
							currentMediaSources = [...currentMediaSources, ...listOfYoutubeIds];
						}

						// Block for experiment: weight_stations
						if (
							config.has(`experimental.weight_stations.${stationId}`) &&
							!!config.get(`experimental.weight_stations.${stationId}`)
						) {
							const weightTagName =
								config.get(`experimental.weight_stations.${stationId}`) === true
									? "weight"
									: config.get(`experimental.weight_stations.${stationId}`);
							const weightMap = {};
							const getYoutubeIds = playlistSongs
								.map(playlistSong => playlistSong.mediaSource)
								.filter(mediaSource => currentMediaSources.indexOf(mediaSource) === -1);

							const { songs } = await SongsModule.runJob("GET_SONGS", { mediaSources: getYoutubeIds });

							const weightRegex = new RegExp(`${weightTagName}\\[(\\d+)\\]`);

							songs.forEach(song => {
								let weight = 1;

								song.tags.forEach(tag => {
									const regexResponse = weightRegex.exec(tag);
									if (regexResponse) weight = Number(regexResponse[1]);
								});

								if (Number.isNaN(weight)) weight = 1;
								weight = Math.round(weight);
								weight = Math.max(1, weight);
								weight = Math.min(10000, weight);

								weightMap[song.mediaSource] = weight;
							});

							const adjustedPlaylistSongs = [];

							playlistSongs.forEach(playlistSong => {
								Array.from({ length: weightMap[playlistSong.mediaSource] }).forEach(() => {
									adjustedPlaylistSongs.push(playlistSong);
								});
							});

							const { array } = await UtilsModule.runJob(
								"SHUFFLE",
								{ array: adjustedPlaylistSongs },
								this
							);

							playlistSongs = array;
						}

						playlistSongs.every(song => {
							if (songsToAdd.length >= songsStillNeeded) return false;

							// Skip Spotify songs
							if (song.mediaSource.startsWith("spotify:")) return true;
							// Skip SoundCloud songs if Soundcloud isn't enabled
							if (song.mediaSource.startsWith("soundcloud:") && !config.get("experimental.soundcloud"))
								return true;
							// Skip songs already in songsToAdd
							if (songsToAdd.find(songToAdd => songToAdd.mediaSource === song.mediaSource)) return true;
							// Skip songs already in the queue
							if (currentMediaSources.indexOf(song.mediaSource) !== -1) return true;

							lastSongAdded = song;
							songsToAdd.push(song);
							return true;
						});

						let { currentSongIndex } = station;

						if (station.autofill.mode === "sequential" && lastSongAdded) {
							const indexOfLastSong = _playlistSongs
								.map(song => song.mediaSource)
								.indexOf(lastSongAdded.mediaSource);

							if (indexOfLastSong !== -1) currentSongIndex = indexOfLastSong;
						}

						return { currentSongs, songsToAdd, currentSongIndex };
					},

					({ currentSongs, songsToAdd, currentSongIndex }, next) => {
						const songs = [];
						async.eachLimit(
							songsToAdd.map(song => song.mediaSource),
							2,
							(mediaSource, next) => {
								MediaModule.runJob("GET_MEDIA", { mediaSource }, this)
									.then(response => {
										const { song } = response;
										const { _id, title, artists, thumbnail, duration, skipDuration, verified } =
											song;
										songs.push({
											_id,
											mediaSource,
											title,
											artists,
											thumbnail,
											duration,
											skipDuration,
											verified
										});
										next();
									})
									.catch(next);
							},
							err => {
								if (err) next(err);
								else {
									const newSongsToAdd = songsToAdd.map(song =>
										songs.find(newSong => newSong.mediaSource === song.mediaSource)
									);
									next(null, currentSongs, newSongsToAdd, currentSongIndex);
								}
							}
						);
					},

					(currentSongs, songsToAdd, currentSongIndex, next) => {
						const newPlaylist = [...currentSongs, ...songsToAdd].map(song => {
							if (!song._id) song._id = null;
							if (!song.requestedAt) song.requestedAt = Date.now();
							if (!song.requestedType) song.requestedType = "autofill";
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
						MediaModule.runJob(
							"GET_MEDIA",
							{
								mediaSource: queueSong.mediaSource
							},
							this
						)
							.then(response => {
								const { song } = response;
								const {
									_id,
									mediaSource,
									title,
									skipDuration,
									artists,
									thumbnail,
									duration,
									verified
								} = song;
								next(null, {
									_id,
									mediaSource,
									title,
									skipDuration,
									artists,
									thumbnail,
									duration,
									verified,
									requestedAt: queueSong.requestedAt,
									requestedBy: queueSong.requestedBy,
									requestedType: queueSong.requestedType,
									likes: song.likes || 0,
									dislikes: song.dislikes || 0
								});
							})
							.catch(next);
					}
				],
				(err, song) => {
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
	 * Process vote to skips for a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station to process
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	PROCESS_SKIP_VOTES(payload) {
		return new Promise((resolve, reject) => {
			StationsModule.log("INFO", `Processing skip votes for station ${payload.stationId}.`);

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
							.then(station => next(null, station))
							.catch(next);
					},

					(station, next) => {
						if (!station) return next("Station not found.");
						return next(null, station);
					},

					(station, next) => {
						WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: `station.${station._id}` }, this)
							.then(sockets => next(null, station, sockets))
							.catch(next);
					},

					(station, sockets, next) => {
						const skipVotes =
							station.currentSong && station.currentSong.skipVotes
								? station.currentSong.skipVotes.length
								: 0;
						let shouldSkip = false;

						if (skipVotes === 0) {
							if (!station.paused && !station.currentSong && station.queue.length > 0) shouldSkip = true;
							return next(null, shouldSkip);
						}

						const users = [];

						return async.each(
							sockets,
							(socketId, next) => {
								WSModule.runJob("SOCKET_FROM_SOCKET_ID", { socketId }, this)
									.then(socket => {
										if (socket && socket.session && socket.session.userId) {
											if (
												!users.includes(socket.session.userId) &&
												(socket.session.stationState !== "participate" ||
													station.currentSong.skipVotes.includes(socket.session.userId))
											)
												users.push(socket.session.userId);
										}
										return next();
									})
									.catch(next);
							},
							err => {
								if (err) return next(err);

								if (
									!station.paused &&
									Math.min(skipVotes, users.length) / users.length >= station.skipVoteThreshold / 100
								)
									shouldSkip = true;
								return next(null, shouldSkip);
							}
						);
					},

					(shouldSkip, next) => {
						if (shouldSkip)
							StationsModule.runJob(
								"SKIP_STATION",
								{
									stationId: payload.stationId,
									natural: false,
									skipReason: "vote_skip"
								},
								this
							)
								.then(() => next())
								.catch(next);
						else next();
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
	 * Creates a station history item
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.stationId - the station id to create the history item for
	 * @param {object} payload.currentSong - the song to create the history item for
	 * @param {string} payload.skipReason - the reason the song was skipped
	 * @param {string} payload.skippedAt - the date/time the song was skipped
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async ADD_STATION_HISTORY_ITEM(payload) {
		if (!config.get("experimental.station_history")) throw new Error("Station history is not enabled");

		const { stationId, currentSong, skipReason, skippedAt } = payload;

		let document = await StationsModule.stationHistoryModel.create({
			stationId,
			type: "song_played",
			payload: {
				song: currentSong,
				skippedAt,
				skipReason
			}
		});

		if (!document) return;

		document = document._doc;

		delete document.__v;
		delete document.documentVersion;

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `station.${stationId}`,
			args: ["event:station.history.new", { data: { historyItem: document } }]
		});

		WSModule.runJob("EMIT_TO_ROOM", {
			room: `manage-station.${stationId}`,
			args: ["event:manageStation.history.new", { data: { stationId, historyItem: document } }]
		});
	}

	/**
	 * Skips a station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the id of the station to skip
	 * @param {string} payload.natural - whether to skip naturally or forcefully
	 * @param {string} payload.skipReason - if it was skipped via force skip or via vote skipping or if it was natural
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

						if (!config.get("experimental.station_history")) return next(null, station);

						const { currentSong } = station;
						if (!currentSong || !currentSong.mediaSource) return next(null, station);

						const stationId = station._id;
						const skippedAt = new Date();
						const { skipReason } = payload;

						return StationsModule.runJob(
							"ADD_STATION_HISTORY_ITEM",
							{
								stationId,
								currentSong,
								skippedAt,
								skipReason
							},
							this
						).finally(() => {
							next(null, station);
						});
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

					async (song, station) => {
						const $set = {};

						if (song === null) $set.currentSong = null;
						else {
							// Block for experiment: queue_autofill_skip_last_x_played
							if (config.has(`experimental.queue_autofill_skip_last_x_played.${payload.stationId}`)) {
								const redisList = `experimental:queue_autofill_skip_last_x_played:${payload.stationId}`;
								const maxListLength = Number(
									config.get(`experimental.queue_autofill_skip_last_x_played.${payload.stationId}`)
								);

								// Add mediaSource to list for this station in Redis list
								await CacheModule.runJob(
									"LPUSH",
									{
										key: `experimental:queue_autofill_skip_last_x_played:${payload.stationId}`,
										value: song.mediaSource
									},
									this
								);

								const currentListLength = await CacheModule.runJob("LLEN", { key: redisList }, this);

								// Removes oldest mediaSource from list for this station in Redis list
								if (currentListLength > maxListLength) {
									const amount = currentListLength - maxListLength;
									const promises = Array.from({ length: amount }).map(() =>
										CacheModule.runJob(
											"RPOP",
											{
												key: `experimental:queue_autofill_skip_last_x_played:${payload.stationId}`
											},
											this
										)
									);
									await Promise.all(promises);
								}
							}

							$set.currentSong = {
								_id: song._id,
								mediaSource: song.mediaSource,
								title: song.title,
								artists: song.artists,
								duration: song.duration,
								skipDuration: song.skipDuration,
								thumbnail: song.thumbnail,
								requestedAt: song.requestedAt,
								requestedBy: song.requestedBy,
								requestedType: song.requestedType,
								verified: song.verified
							};
						}

						$set.startedAt = Date.now();
						$set.timePaused = 0;
						if (station.paused) $set.pausedAt = Date.now();
						return { $set, station };
					},

					({ $set, station }, next) => {
						StationsModule.stationModel.updateOne({ _id: station._id }, { $set }, err => {
							if (err) return next(err);

							return StationsModule.runJob("UPDATE_STATION", { stationId: station._id }, this)
								.then(station => {
									next(null, station);
								})
								.catch(next);
						});
					},

					(station, next) => {
						if (station.currentSong !== null && station.currentSong.mediaSource !== undefined) {
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
										const dispatchNextSong = () => {
											socket.dispatch("event:station.nextSong", {
												data: {
													stationId: station._id,
													currentSong
												}
											});
										};
										hasPermission("stations.index", session, station._id)
											.then(() => dispatchNextSong())
											.catch(() => {
												hasPermission("stations.index.other", session)
													.then(() => dispatchNextSong())
													.catch(() => {});
											});
									}
								);
							}
						});
					}

					WSModule.runJob("GET_SOCKETS_FOR_ROOM", { room: `station.${station._id}` }).then(sockets => {
						if (station.currentSong !== null && station.currentSong.mediaSource !== undefined) {
							WSModule.runJob("SOCKETS_JOIN_SONG_ROOM", {
								sockets,
								room: `song.${station.currentSong.mediaSource}`
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
						hasPermission("stations.view", payload.userId, payload.station._id)
							.then(() => next(true))
							.catch(() => next("Not allowed"));
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
											if (!(socket.session && socket.session.sessionId)) {
												socketsThatCannot.push(socket);
												next();
											} else
												hasPermission("stations.view", socket.session, payload.station._id)
													.then(() => {
														socketsThatCan.push(socket);
														next();
													})
													.catch(() => {
														socketsThatCannot.push(socket);
														next();
													});
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
						StationsModule.stationModel.updateOne(
							{ _id: payload.stationId },
							{ $push: { "autofill.playlists": payload.playlistId } },
							next
						);
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
						StationsModule.stationModel.updateOne(
							{ _id: payload.stationId },
							{ $pull: { "autofill.playlists": payload.playlistId } },
							next
						);
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
						StationsModule.stationModel.updateOne(
							{ _id: payload.stationId },
							{ $push: { blacklist: payload.playlistId } },
							next
						);
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
						StationsModule.stationModel.updateOne(
							{ _id: payload.stationId },
							{ $pull: { blacklist: payload.playlistId } },
							next
						);
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
												this.publishProgress({
													status: "update",
													message: `Updating station "${station._id}"`
												});
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

	/**
	 * Add to a station queue
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @param {string} payload.mediaSource - the media source
	 * @param {string} payload.requestUser - the requesting user id
	 * @param {string} payload.requestType - the request type
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	ADD_TO_QUEUE(payload) {
		return new Promise((resolve, reject) => {
			const { stationId, mediaSource, requestUser, requestType } = payload;
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
						if (mediaSource.startsWith("spotify:")) return next("Spotify playback is not supported.");
						if (station.currentSong && station.currentSong.mediaSource === mediaSource)
							return next("That song is currently playing.");
						if (station.queue.find(song => song.mediaSource === mediaSource))
							return next("That song is already in the queue.");

						return next(null, station);
					},

					(station, next) => {
						MediaModule.runJob("GET_MEDIA", { mediaSource }, this)
							.then(response => {
								const { song } = response;
								const { _id, title, skipDuration, artists, thumbnail, duration, verified } = song;
								next(
									null,
									{
										_id,
										mediaSource,
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
									items.find(x => x.mediaSource === item.mediaSource) ? [...items] : [...items, item],
								[]
							);

						if (blacklistedSongs.find(blacklistedSong => blacklistedSong.mediaSource === song.mediaSource))
							next("That song is in an blacklisted playlist and cannot be played.");
						else next(null, song, station);
					},

					(song, station, next) => {
						song.requestedBy = requestUser;
						song.requestedAt = Date.now();
						song.requestedType = requestType;
						if (station.queue.length === 0) return next(null, song, station);
						if (
							requestUser &&
							station.queue.filter(queueSong => queueSong.requestedBy === song.requestedBy).length >=
								station.requests.limit
						)
							return next(`The max amount of songs per user is ${station.requests.limit}.`);
						return next(null, song, station);
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

					(song, station, next) => {
						const queueAddBeforeAutofilled = config.get(`experimental.queue_add_before_autofilled`);

						if (
							queueAddBeforeAutofilled === true ||
							(Array.isArray(queueAddBeforeAutofilled) &&
								queueAddBeforeAutofilled.indexOf(stationId) !== -1)
						) {
							let position = station.queue.length;

							if (station.autofill.enabled && station.queue.length >= station.autofill.limit) {
								position = -station.autofill.limit;
							}

							StationsModule.stationModel.updateOne(
								{ _id: stationId },
								{
									$push: {
										queue: {
											$each: [song],
											$position: position
										}
									}
								},
								{ runValidators: true },
								next
							);

							return;
						}

						StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $push: { queue: song } },
							{ runValidators: true },
							next
						);
					},

					(res, next) => {
						StationsModule.runJob("UPDATE_STATION", { stationId }, this)
							.then(() => next())
							.catch(next);
					},

					next => {
						CacheModule.runJob(
							"PUB",
							{
								channel: "station.queueUpdate",
								value: stationId
							},
							this
						)
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

	/**
	 * Remove from a station queue
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @param {string} payload.mediaSource - the media source
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_FROM_QUEUE(payload) {
		return new Promise((resolve, reject) => {
			const { stationId, mediaSource } = payload;
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
						if (!station.queue.find(song => song.mediaSource === mediaSource))
							return next("That song is not currently in the queue.");

						return StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $pull: { queue: { mediaSource } } },
							next
						);
					},

					(res, next) => {
						StationsModule.runJob("UPDATE_STATION", { stationId }, this)
							.then(station => {
								if (station.autofill.enabled)
									StationsModule.runJob("AUTOFILL_STATION", { stationId }, this)
										.then(() => next())
										.catch(err => {
											if (
												err === "Autofill is disabled in this station" ||
												err === "Autofill limit reached"
											)
												return next();
											return next(err);
										});
								else next();
							})
							.catch(next);
					},

					next =>
						CacheModule.runJob(
							"PUB",
							{
								channel: "station.queueUpdate",
								value: stationId
							},
							this
						)
							.then(() => next())
							.catch(next)
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * Add DJ to station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @param {string} payload.userId - the dj user id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	ADD_DJ(payload) {
		return new Promise((resolve, reject) => {
			const { stationId, userId } = payload;
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
						if (station.djs.find(dj => dj === userId)) return next("That user is already a DJ.");

						return StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $push: { djs: userId } },
							next
						);
					},

					(res, next) => {
						StationsModule.runJob("UPDATE_STATION", { stationId }, this)
							.then(() => next())
							.catch(next);
					},

					next =>
						CacheModule.runJob(
							"PUB",
							{
								channel: "station.djs.added",
								value: { stationId, userId }
							},
							this
						)
							.then(() => next())
							.catch(next)
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * Remove DJ from station
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @param {string} payload.userId - the dj user id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_DJ(payload) {
		return new Promise((resolve, reject) => {
			const { stationId, userId } = payload;
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
						if (!station.djs.find(dj => dj === userId)) return next("That user is not currently a DJ.");

						return StationsModule.stationModel.updateOne(
							{ _id: stationId },
							{ $pull: { djs: userId } },
							next
						);
					},

					(res, next) => {
						StationsModule.runJob("UPDATE_STATION", { stationId }, this)
							.then(() => next())
							.catch(next);
					},

					next =>
						CacheModule.runJob(
							"PUB",
							{
								channel: "station.djs.removed",
								value: { stationId, userId }
							},
							this
						)
							.then(() => next())
							.catch(next)
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
