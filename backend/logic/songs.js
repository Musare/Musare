import async from "async";
import config from "config";
import mongoose from "mongoose";
import CoreClass from "../core";

let SongsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let YouTubeModule;
let SoundCloudModule;
let StationsModule;
let PlaylistsModule;
let MediaModule;
let WSModule;

class _SongsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("songs");

		SongsModule = this;
	}

	/**
	 * Initialises the songs module
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;
		YouTubeModule = this.moduleManager.modules.youtube;
		SoundCloudModule = this.moduleManager.modules.soundcloud;
		StationsModule = this.moduleManager.modules.stations;
		PlaylistsModule = this.moduleManager.modules.playlists;
		MediaModule = this.moduleManager.modules.media;
		WSModule = this.moduleManager.modules.ws;

		this.SongModel = await DBModule.runJob("GET_MODEL", { modelName: "song" });
		this.SongSchemaCache = await CacheModule.runJob("GET_SCHEMA", { schemaName: "song" });

		this.setStage(2);

		return new Promise((resolve, reject) => {
			CacheModule.runJob("SUB", {
				channel: "song.created",
				cb: async data =>
					WSModule.runJob("EMIT_TO_ROOMS", {
						rooms: ["import-album", `edit-song.${data.song._id}`, "edit-songs"],
						args: ["event:admin.song.created", { data }]
					})
			});

			async.waterfall(
				[
					next => {
						this.setStage(2);
						CacheModule.runJob("HGETALL", { table: "songs" })
							.then(songs => {
								next(null, songs);
							})
							.catch(next);
					},

					(songs, next) => {
						this.setStage(3);

						if (!songs) return next();

						const mediaSources = Object.keys(songs);

						return async.each(
							mediaSources,
							(mediaSource, next) => {
								SongsModule.SongModel.findOne({ mediaSource }, (err, song) => {
									if (err) next(err);
									else if (!song)
										CacheModule.runJob("HDEL", {
											table: "songs",
											key: mediaSource
										})
											.then(() => next())
											.catch(next);
									else next();
								});
							},
							next
						);
					},

					next => {
						this.setStage(4);
						SongsModule.SongModel.find({}, next);
					},

					(songs, next) => {
						this.setStage(5);
						async.each(
							songs,
							(song, next) => {
								CacheModule.runJob("HSET", {
									table: "songs",
									key: song.mediaSource,
									value: SongsModule.SongSchemaCache(song)
								})
									.then(() => next())
									.catch(next);
							},
							next
						);
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", { error: err });
						reject(new Error(err));
					} else resolve();
				}
			);
		});
	}

	/**
	 * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.songId - the id of the song we are trying to get
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SONG(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						if (!mongoose.Types.ObjectId.isValid(payload.songId))
							return next("songId is not a valid ObjectId.");
						return CacheModule.runJob("HGET", { table: "songs", key: payload.songId }, this)
							.then(song => next(null, song))
							.catch(next);
					},

					(song, next) => {
						if (song) return next(true, song);
						return SongsModule.SongModel.findOne({ _id: payload.songId }, next);
					},

					(song, next) => {
						if (song) {
							CacheModule.runJob(
								"HSET",
								{
									table: "songs",
									key: payload.songId,
									value: song
								},
								this
							).then(song => next(null, song));
						} else next("Song not found.");
					}
				],
				(err, song) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ song });
				}
			);
		});
	}

	/**
	 * Gets songs by id from Mongo
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.mediaSources - the media sources of the songs we are trying to get
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SONGS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => SongsModule.SongModel.find({ mediaSource: { $in: payload.mediaSources } }, next),

					(songs, next) => {
						const mediaSources = payload.mediaSources.filter(
							mediaSource => !songs.find(song => song.mediaSource === mediaSource)
						);

						if (mediaSources.length === 0) return next(null, songs);

						const mediaSourceTypes = [];
						mediaSources.forEach(mediaSource => {
							const mediaSourceType = mediaSource.split(":")[0];
							if (mediaSourceTypes.indexOf(mediaSourceType) === -1)
								mediaSourceTypes.push(mediaSourceType);
						});

						if (mediaSourceTypes.length !== 1)
							return next(`Expected 1 media source types, got ${mediaSourceTypes.length}.`);
						const [mediaSourceType] = mediaSourceTypes;

						if (mediaSourceType === "youtube")
							return YouTubeModule.youtubeVideoModel.find(
								{
									youtubeId: {
										$in: mediaSources
											.filter(mediaSource => mediaSource.startsWith("youtube:"))
											.map(mediaSource => mediaSource.split(":")[1])
									}
								},
								(err, videos) => {
									if (err) next(err);
									else {
										const youtubeVideos = videos.map(video => {
											const { youtubeId, title, author, duration, thumbnail } = video;
											return {
												mediaSource: `youtube:${youtubeId}`,
												title,
												artists: [author],
												genres: [],
												tags: [],
												duration,
												skipDuration: 0,
												thumbnail:
													thumbnail ||
													`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
												requestedBy: null,
												requestedAt: Date.now(),
												verified: false,
												youtubeVideoId: video._id
											};
										});
										next(
											null,
											payload.mediaSources
												.map(
													mediaSource =>
														songs.find(song => song.mediaSource === mediaSource) ||
														youtubeVideos.find(video => video.mediaSource === mediaSource)
												)
												.filter(song => !!song)
										);
									}
								}
							);

						if (config.get("experimental.soundcloud") && mediaSourceType === "soundcloud")
							return SoundCloudModule.soundcloudTrackModel.find(
								{
									trackId: {
										$in: mediaSources
											.filter(mediaSource => mediaSource.startsWith("soundcloud:"))
											.map(mediaSource => mediaSource.split(":")[1])
									}
								},
								(err, tracks) => {
									if (err) next(err);
									else {
										const soundcloudSongs = tracks.map(track => {
											const { trackId, title, username, duration, artworkUrl } = track;
											return {
												mediaSource: `soundcloud:${trackId}`,
												title,
												artists: [username],
												genres: [],
												tags: [],
												duration,
												skipDuration: 0,
												thumbnail: artworkUrl,
												requestedBy: null,
												requestedAt: Date.now(),
												verified: false,
												soundcloudTrackId: track._id
											};
										});

										next(
											null,
											payload.mediaSources
												.map(
													mediaSource =>
														songs.find(song => song.mediaSource === mediaSource) ||
														soundcloudSongs.find(
															soundcloudSong => soundcloudSong.mediaSource === mediaSource
														)
												)
												.filter(song => !!song)
										);
									}
								}
							);

						return next(`Unknown media source specified: ${mediaSourceType}.`);
					}
				],
				(err, songs) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ songs });
				}
			);
		});
	}

	/**
	 * Create song
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.song - the song object
	 * @param {string} payload.userId - the user id of the person requesting the song
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CREATE_SONG(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						DBModule.runJob("GET_MODEL", { modelName: "user" }, this)
							.then(UserModel => {
								UserModel.findOne(
									{ _id: payload.userId },
									{ "preferences.anonymousSongRequests": 1 },
									next
								);
							})
							.catch(next);
					},

					(user, next) => {
						const song = new SongsModule.SongModel({
							...payload.song,
							requestedBy: user.preferences.anonymousSongRequests ? null : payload.userId,
							requestedAt: Date.now()
						});
						if (song.verified) {
							song.verifiedBy = payload.userId;
							song.verifiedAt = Date.now();
						}
						song.save({ validateBeforeSave: true }, err => {
							if (err) return next(err, song);
							return next(null, song);
						});
					},

					(song, next) => {
						SongsModule.runJob("UPDATE_SONG", { songId: song._id });
						return next(null, song);
					},

					(song, next) => {
						MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource: song.mediaSource }, this)
							.then(() => next(null, song))
							.catch(next);
					},

					(song, next) => {
						CacheModule.runJob("PUB", {
							channel: "song.created",
							value: { song }
						})
							.then(() => next(null, song))
							.catch(next);
					}
				],
				(err, song) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ song });
				}
			);
		});
	}

	/**
	 * Gets a song from id from Mongo and updates the cache with it
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.songId - the id of the song we are trying to update
	 * @param {string} payload.oldStatus - old status of song being updated (optional)
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async UPDATE_SONG(payload) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.findOne({ _id: payload.songId }, next);
					},

					(song, next) => {
						if (!song) {
							CacheModule.runJob("HDEL", {
								table: "songs",
								key: payload.songId
							});
							return next("Song not found.");
						}

						return CacheModule.runJob(
							"HSET",
							{
								table: "songs",
								key: payload.songId,
								value: song
							},
							this
						)
							.then(() => {
								const {
									_id,
									mediaSource,
									title,
									artists,
									thumbnail,
									duration,
									skipDuration,
									verified
								} = song;
								next(null, {
									_id,
									mediaSource,
									title,
									artists,
									thumbnail,
									duration,
									skipDuration,
									verified
								});
							})
							.catch(next);
					},

					(song, next) => {
						playlistModel.updateMany({ "songs._id": song._id }, { $set: { "songs.$": song } }, err => {
							if (err) next(err);
							else next(null, song);
						});
					},

					(song, next) => {
						playlistModel.updateMany(
							{ "songs.mediaSource": song.mediaSource },
							{ $set: { "songs.$": song } },
							err => {
								if (err) next(err);
								else next(null, song);
							}
						);
					},

					(song, next) => {
						playlistModel.find({ "songs._id": song._id }, (err, playlists) => {
							if (err) next(err);
							else {
								async.eachLimit(
									playlists,
									1,
									(playlist, next) => {
										PlaylistsModule.runJob(
											"UPDATE_PLAYLIST",
											{
												playlistId: playlist._id
											},
											this
										)
											.then(() => {
												next();
											})
											.catch(err => {
												next(err);
											});
									},
									err => {
										if (err) next(err);
										else next(null, song);
									}
								);
							}
						});
					},

					(song, next) => {
						stationModel.updateMany({ "queue._id": song._id }, { $set: { "queue.$": song } }, err => {
							if (err) next(err);
							else next(null, song);
						});
					},

					(song, next) => {
						stationModel.updateMany(
							{ "queue.mediaSource": song.mediaSource },
							{ $set: { "queue.$": song } },
							err => {
								if (err) next(err);
								else next(null, song);
							}
						);
					},

					(song, next) => {
						stationModel.find({ "queue._id": song._id }, (err, stations) => {
							if (err) next(err);
							else {
								async.eachLimit(
									stations,
									1,
									(station, next) => {
										StationsModule.runJob("UPDATE_STATION", { stationId: station._id }, this)
											.then(() => {
												next();
											})
											.catch(err => {
												next(err);
											});
									},
									err => {
										if (err) next(err);
										else next(null, song);
									}
								);
							}
						});
					},

					(song, next) => {
						async.eachLimit(
							song.genres,
							1,
							(genre, next) => {
								PlaylistsModule.runJob(
									"AUTOFILL_GENRE_PLAYLIST",
									{ genre, createPlaylist: song.verified },
									this
								)
									.then(() => {
										next();
									})
									.catch(err => next(err));
							},
							err => {
								next(err, song);
							}
						);
					}
				],
				(err, song) => {
					if (err && err !== true) return reject(new Error(err));

					if (!payload.oldStatus) payload.oldStatus = null;

					CacheModule.runJob("PUB", {
						channel: "song.updated",
						value: { songId: song._id, oldStatus: payload.oldStatus }
					});

					return resolve(song);
				}
			);
		});
	}

	/**
	 * Gets multiple songs from id from Mongo and updates the cache with it
	 * @param {object} payload - an object containing the payload
	 * @param {Array} payload.songIds - the ids of the songs we are trying to update
	 * @param {string} payload.oldStatus - old status of song being updated (optional)
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async UPDATE_SONGS(payload) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);
		const stationModel = await DBModule.runJob("GET_MODEL", { modelName: "station" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					// Get songs from Mongo
					next => {
						const { songIds } = payload;

						this.publishProgress({ status: "update", message: `Updating songs (stage 1)` });

						SongsModule.SongModel.find({ _id: songIds }, next);
					},

					// Any songs that were not in Mongo, remove from cache, if they're in the cache
					(songs, next) => {
						const { songIds } = payload;

						this.publishProgress({ status: "update", message: `Updating songs (stage 2)` });

						async.eachLimit(
							songIds,
							1,
							(songId, next) => {
								if (songs.findIndex(song => song._id.toString() === songId) === -1) {
									// NOTE: could be made lower priority
									CacheModule.runJob("HDEL", {
										table: "songs",
										key: songId
									});
									next();
								} else next();
							},
							() => {
								next(null, songs);
							}
						);
					},

					// Adds/updates all songs in the cache
					(songs, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 3)` });

						async.eachLimit(
							songs,
							1,
							(song, next) => {
								CacheModule.runJob(
									"HSET",
									{
										table: "songs",
										key: song._id,
										value: song
									},
									this
								)
									.then(() => {
										next();
									})
									.catch(next);
							},
							() => {
								next(null, songs);
							}
						);
					},

					// Updates all playlists that the songs are in by setting the new trimmed song
					(songs, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 4)` });

						const trimmedSongs = songs.map(song => {
							const { _id, mediaSource, title, artists, thumbnail, duration, verified } = song;
							return {
								_id,
								mediaSource,
								title,
								artists,
								thumbnail,
								duration,
								verified
							};
						});

						const playlistsToUpdate = new Set();

						async.eachLimit(
							trimmedSongs,
							1,
							(trimmedSong, next) => {
								async.waterfall(
									[
										next => {
											playlistModel.updateMany(
												{ "songs._id": trimmedSong._id },
												{ $set: { "songs.$": trimmedSong } },
												next
											);
										},

										(res, next) => {
											playlistModel.find({ "songs._id": trimmedSong._id }, next);
										},

										(playlists, next) => {
											playlists.forEach(playlist => {
												playlistsToUpdate.add(playlist._id.toString());
											});

											next();
										}
									],
									next
								);
							},
							err => {
								next(err, songs, playlistsToUpdate);
							}
						);
					},

					// Updates all playlists that the songs are in
					(songs, playlistsToUpdate, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 5)` });

						async.eachLimit(
							playlistsToUpdate,
							1,
							(playlistId, next) => {
								PlaylistsModule.runJob(
									"UPDATE_PLAYLIST",
									{
										playlistId
									},
									this
								)
									.then(() => {
										next();
									})
									.catch(err => {
										next(err);
									});
							},
							err => {
								next(err, songs);
							}
						);
					},

					// Updates all station queues that the songs are in by setting the new trimmed song
					(songs, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 6)` });

						const stationsToUpdate = new Set();

						async.eachLimit(
							songs,
							1,
							(song, next) => {
								async.waterfall(
									[
										next => {
											const { mediaSource, title, artists, thumbnail, duration, verified } = song;
											stationModel.updateMany(
												{ "queue._id": song._id },
												{
													$set: {
														"queue.$.mediaSource": mediaSource,
														"queue.$.title": title,
														"queue.$.artists": artists,
														"queue.$.thumbnail": thumbnail,
														"queue.$.duration": duration,
														"queue.$.verified": verified
													}
												},
												next
											);
										},

										(res, next) => {
											stationModel.find({ "queue._id": song._id }, next);
										},

										(stations, next) => {
											stations.forEach(station => {
												stationsToUpdate.add(station._id.toString());
											});

											next();
										}
									],
									next
								);
							},
							err => {
								next(err, songs, stationsToUpdate);
							}
						);
					},

					// Updates all playlists that the songs are in
					(songs, stationsToUpdate, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 7)` });

						async.eachLimit(
							stationsToUpdate,
							1,
							(stationId, next) => {
								StationsModule.runJob(
									"UPDATE_STATION",
									{
										stationId
									},
									this
								)
									.then(() => {
										next();
									})
									.catch(err => {
										next(err);
									});
							},
							err => {
								next(err, songs);
							}
						);
					},

					// Autofill the genre playlists of all genres of all songs
					(songs, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 8)` });

						const genresToAutofill = new Set();

						songs.forEach(song => {
							if (song.verified)
								song.genres.forEach(genre => {
									genresToAutofill.add(genre);
								});
						});

						async.eachLimit(
							genresToAutofill,
							1,
							(genre, next) => {
								PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre, createPlaylist: true }, this)
									.then(() => {
										next();
									})
									.catch(err => next(err));
							},
							err => {
								next(err, songs);
							}
						);
					},

					// Send event that the song was updated
					(songs, next) => {
						this.publishProgress({ status: "update", message: `Updating songs (stage 9)` });

						async.eachLimit(
							songs,
							1,
							(song, next) => {
								CacheModule.runJob("PUB", {
									channel: "song.updated",
									value: { songId: song._id, oldStatus: null }
								});
								next();
							},
							() => {
								next();
							}
						);
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));

					return resolve();
				}
			);
		});
	}

	/**
	 * Updates all songs
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	UPDATE_ALL_SONGS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.find({}, next);
					},

					(songs, next) => {
						let index = 0;
						const { length } = songs;
						async.eachLimit(
							songs,
							2,
							(song, next) => {
								index += 1;
								console.log(`Updating song #${index} out of ${length}: ${song._id}`);
								this.publishProgress({ status: "update", message: `Updating song "${song._id}"` });
								SongsModule.runJob("UPDATE_SONG", { songId: song._id }, this)
									.then(() => {
										next();
									})
									.catch(err => {
										next(err);
									});
							},
							err => {
								next(err);
							}
						);
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve();
				}
			);
		});
	}

	// /**
	//  * Deletes song from id from Mongo and cache
	//  *
	//  * @param {object} payload - returns an object containing the payload
	//  * @param {string} payload.songId - the song id of the song we are trying to delete
	//  * @returns {Promise} - returns a promise (resolve, reject)
	//  */
	// DELETE_SONG(payload) {
	// 	return new Promise((resolve, reject) =>
	// 		async.waterfall(
	// 			[
	// 				next => {
	// 					SongsModule.SongModel.deleteOne({ _id: payload.songId }, next);
	// 				},

	// 				next => {
	// 					CacheModule.runJob(
	// 						"HDEL",
	// 						{
	// 							table: "songs",
	// 							key: payload.songId
	// 						},
	// 						this
	// 					)
	// 						.then(() => next())
	// 						.catch(next);
	// 				},

	// 				next => {
	// 					this.log("INFO", `Going to update playlists and stations now for deleted song ${payload.songId}`);
	// 					DBModule.runJob("GET_MODEL", { modelName: "playlist" }).then(playlistModel => {
	// 						playlistModel.find({ "songs._id": song._id }, (err, playlists) => {
	// 							if (err) this.log("ERROR", err);
	// 							else {
	// 								playlistModel.updateMany(
	// 									{ "songs._id": payload.songId },
	// 									{ $pull: { "songs.$._id": payload.songId} },
	// 									err => {
	// 										if (err) this.log("ERROR", err);
	// 										else {
	// 											playlists.forEach(playlist => {
	// 												PlaylistsModule.runJob("UPDATE_PLAYLIST", {
	// 													playlistId: playlist._id
	// 												});
	// 											});
	// 										}
	// 									}
	// 								);

	// 							}
	// 						});
	// 					});
	// 					DBModule.runJob("GET_MODEL", { modelName: "station" }).then(stationModel => {
	// 						stationModel.find({ "queue._id": payload.songId }, (err, stations) => {
	// 							stationModel.updateMany(
	// 								{ "queue._id": payload.songId },
	// 								{
	// 									$pull: { "queue._id":  }
	// 								},
	// 								err => {
	// 									if (err) this.log("ERROR", err);
	// 									else {
	// 										stations.forEach(station => {
	// 											StationsModule.runJob("UPDATE_STATION", { stationId: station._id });
	// 										});
	// 									}
	// 								}
	// 							);
	// 						});
	// 					});
	// 				}
	// 			],
	// 			err => {
	// 				if (err && err !== true) return reject(new Error(err));
	// 				return resolve();
	// 			}
	// 		)
	// 	);
	// }

	/**
	 * Searches through songs
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.query - the query
	 * @param {string} payload.includeUnverified - include unverified songs
	 * @param {string} payload.includeVerified - include verified songs
	 * @param {string} payload.trimmed - include trimmed songs
	 * @param {string} payload.page - page (default 1)
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SEARCH(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const isVerified = [];
						if (payload.includeUnverified) isVerified.push(false);
						if (payload.includeVerified) isVerified.push(true);
						if (isVerified.length === 0) return next("No verified status has been included.");

						let { query } = payload;

						const isRegex =
							query.length > 2 && query.indexOf("/") === 0 && query.lastIndexOf("/") === query.length - 1;
						if (isRegex) query = query.slice(1, query.length - 1);
						else query = query.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

						const filterArray = [
							{
								title: new RegExp(`${query}`, "i"),
								verified: { $in: isVerified }
							},
							{
								artists: new RegExp(`${query}`, "i"),
								verified: { $in: isVerified }
							}
						];

						return next(null, filterArray);
					},

					(filterArray, next) => {
						const page = payload.page ? payload.page : 1;
						const pageSize = 15;
						const skipAmount = pageSize * (page - 1);
						const query = { $or: filterArray };

						const mediaSources = [];
						if (!config.get("experimental.soundcloud")) {
							mediaSources.push(/^soundcloud:/);
						}
						if (!config.get("experimental.spotify")) {
							mediaSources.push(/^spotify:/);
						}
						if (mediaSources.length > 0) query.mediaSource = { $nin: mediaSources };

						SongsModule.SongModel.find(query).count((err, count) => {
							if (err) next(err);
							else {
								SongsModule.SongModel.find(query)
									.skip(skipAmount)
									.limit(pageSize)
									.exec((err, songs) => {
										if (err) next(err);
										else {
											next(null, {
												songs,
												page,
												pageSize,
												skipAmount,
												count
											});
										}
									});
							}
						});
					},

					(data, next) => {
						if (data.songs.length === 0) next("No songs found");
						else if (payload.trimmed) {
							next(null, {
								songs: data.songs.map(song => {
									const { _id, mediaSource, title, artists, thumbnail, duration, verified } = song;
									return {
										_id,
										mediaSource,
										title,
										artists,
										thumbnail,
										duration,
										verified
									};
								}),
								...data
							});
						} else next(null, data);
					}
				],
				(err, data) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(data);
				}
			);
		});
	}

	/**
	 * Gets an array of all genres
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_ALL_GENRES() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.find({ verified: true }, { genres: 1, _id: false }, next);
					},

					(songs, next) => {
						let allGenres = [];
						songs.forEach(song => {
							allGenres = allGenres.concat(song.genres);
						});

						const lowerCaseGenres = allGenres.map(genre => genre.toLowerCase());
						const uniqueGenres = lowerCaseGenres.filter(
							(value, index, self) => self.indexOf(value) === index
						);

						next(null, uniqueGenres);
					}
				],
				(err, genres) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ genres });
				}
			);
		});
	}

	/**
	 * Gets an array of all songs with a specific genre
	 * @param {object} payload - returns an object containing the payload
	 * @param {string} payload.genre - the genre
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_ALL_SONGS_WITH_GENRE(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.find(
							{
								verified: true,
								genres: { $regex: new RegExp(`^${payload.genre.toLowerCase()}$`, "i") }
							},
							next
						);
					}
				],
				(err, songs) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ songs });
				}
			);
		});
	}

	// runjob songs GET_ORPHANED_PLAYLIST_SONGS {}

	/**
	 * Gets a orphaned playlist songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ORPHANED_PLAYLIST_SONGS() {
		return new Promise((resolve, reject) => {
			DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this).then(playlistModel => {
				playlistModel.find({}, (err, playlists) => {
					if (err) reject(new Error(err));
					else {
						SongsModule.SongModel.find({}, { _id: true, mediaSource: true }, (err, songs) => {
							if (err) reject(new Error(err));
							else {
								const songIds = songs.map(song => song._id.toString());
								const orphanedYoutubeIds = new Set();
								async.eachLimit(
									playlists,
									1,
									(playlist, next) => {
										playlist.songs.forEach(song => {
											if (
												(!song._id || songIds.indexOf(song._id.toString() === -1)) &&
												!orphanedYoutubeIds.has(song.mediaSource)
											) {
												orphanedYoutubeIds.add(song.mediaSource);
											}
										});
										next();
									},
									() => {
										resolve({ youtubeIds: Array.from(orphanedYoutubeIds) });
									}
								);
							}
						});
					}
				});
			});
		});
	}

	/**
	 * Requests all orphaned playlist songs, adding them to the database
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REQUEST_ORPHANED_PLAYLIST_SONGS() {
		return new Promise((resolve, reject) => {
			DBModule.runJob("GET_MODEL", { modelName: "playlist" })
				.then(playlistModel => {
					SongsModule.runJob("GET_ORPHANED_PLAYLIST_SONGS", {}, this).then(response => {
						const { mediaSources } = response;
						const playlistsToUpdate = new Set();

						async.eachLimit(
							mediaSources,
							1,
							(mediaSource, next) => {
								async.waterfall(
									[
										next => {
											this.publishProgress({
												status: "update",
												message: `Requesting "${mediaSource}"`
											});
											console.log(
												mediaSource,
												`this is song ${mediaSources.indexOf(mediaSource) + 1}/${
													mediaSources.length
												}`
											);
											setTimeout(next, 150);
										},

										next => {
											MediaModule.runJob("GET_MEDIA", { mediaSource }, this)
												.then(res => next(null, res.song))
												.catch(next);
										},

										(song, next) => {
											const { _id, title, artists, thumbnail, duration, verified } = song;
											const trimmedSong = {
												_id,
												mediaSource,
												title,
												artists,
												thumbnail,
												duration,
												verified
											};
											playlistModel.updateMany(
												{ "songs.mediaSource": song.mediaSource },
												{ $set: { "songs.$": trimmedSong } },
												err => {
													next(err, song);
												}
											);
										},

										(song, next) => {
											playlistModel.find({ "songs._id": song._id }, next);
										},

										(playlists, next) => {
											playlists.forEach(playlist => {
												playlistsToUpdate.add(playlist._id.toString());
											});

											next();
										}
									],
									next
								);
							},
							err => {
								if (err) reject(err);
								else {
									async.eachLimit(
										Array.from(playlistsToUpdate),
										1,
										(playlistId, next) => {
											PlaylistsModule.runJob(
												"UPDATE_PLAYLIST",
												{
													playlistId
												},
												this
											)
												.then(() => {
													next();
												})
												.catch(next);
										},
										err => {
											if (err) reject(err);
											else resolve();
										}
									);
								}
							}
						);
					});
				})
				.catch(reject);
		});
	}

	/**
	 * Gets a list of all genres
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_GENRES() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.distinct("genres", next);
					}
				],
				(err, genres) => {
					if (err) reject(err);
					resolve({ genres });
				}
			);
		});
	}

	/**
	 * Gets a list of all artists
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ARTISTS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.distinct("artists", next);
					}
				],
				(err, artists) => {
					if (err) reject(err);
					resolve({ artists });
				}
			);
		});
	}

	/**
	 * Gets a list of all tags
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_TAGS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.distinct("tags", next);
					}
				],
				(err, tags) => {
					if (err) reject(err);
					resolve({ tags });
				}
			);
		});
	}

	/**
	 * Gets a list of all media sources
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async GET_ALL_MEDIA_SOURCES() {
		return SongsModule.SongModel.distinct("mediaSource");
	}
}

export default new _SongsModule();
