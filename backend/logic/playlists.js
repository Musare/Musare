import async from "async";

import CoreClass from "../core";

let PlaylistsModule;
let StationsModule;
let SongsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let MediaModule;
let WSModule;

class _PlaylistsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("playlists");

		PlaylistsModule = this;
	}

	/**
	 * Initialises the playlists module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		StationsModule = this.moduleManager.modules.stations;
		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;
		SongsModule = this.moduleManager.modules.songs;
		MediaModule = this.moduleManager.modules.media;
		WSModule = this.moduleManager.modules.ws;

		this.playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" });
		this.playlistSchemaCache = await CacheModule.runJob("GET_SCHEMA", { schemaName: "playlist" });

		CacheModule.runJob("SUB", {
			channel: "playlist.updated",
			cb: async data => {
				PlaylistsModule.playlistModel.findOne(
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
						WSModule.runJob("EMIT_TO_ROOM", {
							room: "admin.playlists",
							args: ["event:admin.playlist.updated", { data: { playlist: newPlaylist } }]
						});
					}
				);
			}
		});

		this.setStage(2);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						this.setStage(3);
						CacheModule.runJob("HGETALL", { table: "playlists" })
							.then(playlists => {
								next(null, playlists);
							})
							.catch(next);
					},

					(playlists, next) => {
						this.setStage(4);

						if (!playlists) return next();

						const playlistIds = Object.keys(playlists);

						return async.each(
							playlistIds,
							(playlistId, next) => {
								PlaylistsModule.playlistModel.findOne({ _id: playlistId }, (err, playlist) => {
									if (err) next(err);
									else if (!playlist) {
										CacheModule.runJob("HDEL", {
											table: "playlists",
											key: playlistId
										})
											.then(() => next())
											.catch(next);
									} else next();
								});
							},
							next
						);
					},

					next => {
						this.setStage(5);
						PlaylistsModule.playlistModel.find({}, next);
					},

					(playlists, next) => {
						this.setStage(6);
						async.each(
							playlists,
							(playlist, cb) => {
								CacheModule.runJob("HSET", {
									table: "playlists",
									key: playlist._id,
									value: PlaylistsModule.playlistSchemaCache(playlist)
								})
									.then(() => cb())
									.catch(next);
							},
							next
						);
					}
				],
				async err => {
					if (err) {
						const formattedErr = await UtilsModule.runJob("GET_ERROR", {
							error: err
						});
						reject(new Error(formattedErr));
					} else {
						resolve();
					}
				}
			);
		});
	}

	/**
	 * Returns a list of playlists that include a specific song
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.songId - the song id
	 * @param {string} payload.includeSongs - include the songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLISTS_WITH_SONG(payload) {
		return new Promise((resolve, reject) => {
			const includeObject = payload.includeSongs ? null : { songs: false };
			PlaylistsModule.playlistModel.find({ "songs._id": payload.songId }, includeObject, (err, playlists) => {
				if (err) reject(err);
				else resolve({ playlists });
			});
		});
	}

	// /**
	//  * Returns a list of youtube ids in all user playlists of the specified user
	//  *
	//  * @param {object} payload - object that contains the payload
	//  * @param {string} payload.userId - the user id
	//  * @returns {Promise} - returns promise (reject, resolve)
	//  */
	// GET_SONG_YOUTUBE_IDS_FROM_PLAYLISTS(payload) {
	// 	return new Promise((resolve, reject) => {
	// 		PlaylistsModule.playlistModel.find({ createdBy: payload.userId }, (err, playlists) => {
	// 			const youtubeIds = new Set();

	// 			if (err) reject(err);
	// 			else {
	// 				playlists.forEach(playlist => {
	// 					playlist.songs.forEach(song => {
	// 						youtubeIds.add(song.youtubeId);
	// 					});
	// 				});

	// 				console.log(Array.from(youtubeIds));

	// 				resolve({ youtubeIds: Array.from(youtubeIds) });
	// 			}
	// 		});
	// 	});
	// }

	/**
	 * Creates a playlist owned by a user
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user to create the playlist for
	 * @param {string} payload.displayName - the display name of the playlist
	 * @param {string} payload.type - the type of the playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_USER_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.create(
				{
					displayName: payload.displayName,
					songs: [],
					createdBy: payload.userId,
					createdAt: Date.now(),
					createdFor: null,
					type: payload.type
				},
				(err, playlist) => {
					if (err) return reject(new Error(err));
					return resolve(playlist._id);
				}
			);
		});
	}

	/**
	 * Creates a playlist that contains all songs of a specific genre
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.genre - the genre
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_GENRE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			PlaylistsModule.runJob("GET_GENRE_PLAYLIST", { genre: payload.genre.toLowerCase() }, this)
				.then(() => {
					reject(new Error("Playlist already exists"));
				})
				.catch(err => {
					if (err.message === "Playlist not found") {
						PlaylistsModule.playlistModel.create(
							{
								displayName: `Genre - ${payload.genre}`,
								songs: [],
								createdBy: "Musare",
								createdFor: `${payload.genre.toLowerCase()}`,
								createdAt: Date.now(),
								type: "genre"
							},
							(err, playlist) => {
								if (err) return reject(new Error(err));
								return resolve(playlist._id);
							}
						);
					} else reject(new Error(err));
				});
		});
	}

	/**
	 * Gets all genre playlists
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.includeSongs - include the songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ALL_GENRE_PLAYLISTS(payload) {
		return new Promise((resolve, reject) => {
			const includeObject = payload.includeSongs ? null : { songs: false };
			PlaylistsModule.playlistModel.find({ type: "genre" }, includeObject, (err, playlists) => {
				if (err) reject(new Error(err));
				else resolve({ playlists });
			});
		});
	}

	/**
	 * Gets all station playlists
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.includeSongs - include the songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ALL_STATION_PLAYLISTS(payload) {
		return new Promise((resolve, reject) => {
			const includeObject = payload.includeSongs ? null : { songs: false };
			PlaylistsModule.playlistModel.find({ type: "station" }, includeObject, (err, playlists) => {
				if (err) reject(new Error(err));
				else resolve({ playlists });
			});
		});
	}

	/**
	 * Gets a genre playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.genre - the genre
	 * @param {string} payload.includeSongs - include the songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_GENRE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const includeObject = payload.includeSongs ? null : { songs: false };
			PlaylistsModule.playlistModel.findOne(
				{ type: "genre", createdFor: payload.genre },
				includeObject,
				(err, playlist) => {
					if (err) reject(new Error(err));
					else if (!playlist) reject(new Error("Playlist not found"));
					else resolve({ playlist });
				}
			);
		});
	}

	/**
	 * Gets all missing genre playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_MISSING_GENRE_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			SongsModule.runJob("GET_ALL_GENRES", {}, this)
				.then(response => {
					const { genres } = response;
					const missingGenres = [];
					async.eachLimit(
						genres,
						1,
						(genre, next) => {
							PlaylistsModule.runJob(
								"GET_GENRE_PLAYLIST",
								{ genre: genre.toLowerCase(), includeSongs: false },
								this
							)
								.then(() => {
									next();
								})
								.catch(err => {
									if (err.message === "Playlist not found") {
										missingGenres.push(genre);
										next();
									} else next(err);
								});
						},
						err => {
							if (err) reject(err);
							else resolve({ genres: missingGenres });
						}
					);
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	/**
	 * Creates all missing genre playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_MISSING_GENRE_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			PlaylistsModule.runJob("GET_MISSING_GENRE_PLAYLISTS", {}, this)
				.then(response => {
					const { genres } = response;
					async.eachLimit(
						genres,
						1,
						(genre, next) => {
							PlaylistsModule.runJob("CREATE_GENRE_PLAYLIST", { genre }, this)
								.then(() => {
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						err => {
							if (err) reject(err);
							else resolve();
						}
					);
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	/**
	 * Gets a station playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.staationId - the station id
	 * @param {string} payload.includeSongs - include the songs
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_STATION_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const includeObject = payload.includeSongs ? null : { songs: false };
			PlaylistsModule.playlistModel.findOne(
				{ type: "station", createdFor: payload.stationId },
				includeObject,
				(err, playlist) => {
					if (err) reject(new Error(err));
					else if (!playlist) reject(new Error("Playlist not found"));
					else resolve({ playlist });
				}
			);
		});
	}

	/**
	 * Adds a song to a playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @param {string} payload.mediaSource - the media source
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	ADD_SONG_TO_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId, mediaSource } = payload;

			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (!playlist) return next("Playlist not found.");
						if (playlist.songs.find(song => song.mediaSource === mediaSource))
							return next("That song is already in the playlist.");
						return next();
					},

					next => {
						MediaModule.runJob("GET_MEDIA", { mediaSource }, this)
							.then(response => {
								const { song } = response;
								const { _id, title, artists, thumbnail, duration, verified } = song;
								next(null, {
									_id,
									mediaSource,
									title,
									artists,
									thumbnail,
									duration,
									verified
								});
							})
							.catch(next);
					},

					(newSong, next) => {
						PlaylistsModule.playlistModel.updateOne(
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
					},

					(playlist, newSong, next) => {
						StationsModule.runJob("GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST", { playlistId })
							.then(response => {
								async.each(
									response.stationIds,
									(stationId, next) => {
										PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId })
											.then()
											.catch();
										next();
									},
									err => {
										if (err) next(err);
										else next(null, playlist, newSong);
									}
								);
							})
							.catch(next);
					},

					(playlist, newSong, next) => {
						if (playlist.type === "user-liked" || playlist.type === "user-disliked") {
							MediaModule.runJob("RECALCULATE_RATINGS", {
								mediaSource: newSong.mediaSource
							})
								.then(ratings => next(null, playlist, newSong, ratings))
								.catch(next);
						} else {
							next(null, playlist, newSong, null);
						}
					}
				],
				(err, playlist, song, ratings) => {
					if (err) reject(err);
					else resolve({ playlist, song, ratings });
				}
			);
		});
	}

	/**
	 * Replaces a song in a playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @param {string} payload.newMediaSource - the new media source
	 * @param {string} payload.oldMediaSource - the old media source
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REPLACE_SONG_IN_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId, newMediaSource, oldMediaSource } = payload;

			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (!playlist) return next("Playlist not found.");
						if (playlist.songs.find(song => song.mediaSource === newMediaSource))
							return next("The new song is already in the playlist.");
						return next();
					},

					next => {
						MediaModule.runJob("GET_MEDIA", { mediaSource: newMediaSource }, this)
							.then(response => {
								const { song } = response;
								const { _id, title, artists, thumbnail, duration, verified } = song;
								next(null, {
									_id,
									mediaSource: newMediaSource,
									title,
									artists,
									thumbnail,
									duration,
									verified
								});
							})
							.catch(next);
					},

					(newSong, next) => {
						PlaylistsModule.playlistModel.updateOne(
							{ _id: playlistId, "songs.mediaSource": oldMediaSource },
							{ $set: { "songs.$": newSong } },
							{ runValidators: true },
							err => {
								if (err) return next(err);
								return PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
									.then(playlist => next(null, playlist, newSong))
									.catch(next);
							}
						);
					},

					(playlist, newSong, next) => {
						StationsModule.runJob("GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST", { playlistId })
							.then(response => {
								async.each(
									response.stationIds,
									(stationId, next) => {
										PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId })
											.then()
											.catch();
										next();
									},
									err => {
										if (err) next(err);
										else next(null, playlist, newSong);
									}
								);
							})
							.catch(next);
					},

					(playlist, newSong, next) => {
						if (playlist.type === "user-liked" || playlist.type === "user-disliked") {
							MediaModule.runJob("RECALCULATE_RATINGS", {
								mediaSource: newSong.mediaSource
							})
								.then(ratings => next(null, playlist, newSong, ratings))
								.catch(next);
						} else {
							next(null, playlist, newSong, null);
						}
					},

					(playlist, newSong, newRatings, next) => {
						if (playlist.type === "user-liked" || playlist.type === "user-disliked") {
							MediaModule.runJob("RECALCULATE_RATINGS", {
								mediaSource: oldMediaSource
							})
								.then(ratings => next(null, playlist, newSong, newRatings, oldRatings))
								.catch(next);
						} else {
							next(null, playlist, newSong, null, null);
						}
					}
				],
				(err, playlist, song, newRatings, oldRatings) => {
					if (err) reject(err);
					else resolve({ playlist, song, newRatings, oldRatings });
				}
			);
		});
	}

	/**
	 * Remove from playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @param {string} payload.mediaSource - the media source
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_FROM_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId, mediaSource } = payload;
			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (!playlist) return next("Playlist not found.");
						if (!playlist.songs.find(song => song.mediaSource === mediaSource))
							return next("That song is not currently in the playlist.");

						return PlaylistsModule.playlistModel.updateOne(
							{ _id: playlistId },
							{ $pull: { songs: { mediaSource } } },
							next
						);
					},

					(res, next) => {
						PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
							.then(playlist => next(null, playlist))
							.catch(next);
					},

					(playlist, next) => {
						StationsModule.runJob("GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST", { playlistId })
							.then(response => {
								async.each(
									response.stationIds,
									(stationId, next) => {
										PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId })
											.then()
											.catch();
										next();
									},
									err => {
										if (err) next(err);
										else next(null, playlist);
									}
								);
							})
							.catch(next);
					},

					(playlist, next) => {
						if (playlist.type === "user-liked" || playlist.type === "user-disliked") {
							MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource })
								.then(ratings => next(null, playlist, ratings))
								.catch(next);
						} else next(null, playlist, null);
					},

					(playlist, ratings, next) =>
						CacheModule.runJob(
							"PUB",
							{
								channel: "playlist.updated",
								value: { playlistId }
							},
							this
						)
							.then(() => next(null, playlist, ratings))
							.catch(next)
				],
				(err, playlist, ratings) => {
					if (err) reject(err);
					else resolve({ playlist, ratings });
				}
			);
		});
	}

	/**
	 * Deletes a song from a playlist based on the media source
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @param {string} payload.mediaSource - the media source
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_SONG_FROM_PLAYLIST_BY_MEDIA_SOURCE_ID(payload) {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.updateOne(
				{ _id: payload.playlistId },
				{ $pull: { songs: { mediaSource: payload.mediaSource } } },
				err => {
					if (err) reject(new Error(err));
					else {
						PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId: payload.playlistId }, this)
							.then(() => resolve())
							.catch(err => {
								reject(new Error(err));
							});
					}
				}
			);
		});
	}

	/**
	 * Fills a genre playlist with songs
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.genre - the genre
	 * @param {string} payload.createPlaylist - create playlist if it doesn't exist, default false
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	AUTOFILL_GENRE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob(
							"GET_GENRE_PLAYLIST",
							{ genre: payload.genre.toLowerCase(), includeSongs: true },
							this
						)
							.then(response => {
								next(null, response.playlist._id);
							})
							.catch(err => {
								if (err.message === "Playlist not found") {
									if (payload.createPlaylist)
										PlaylistsModule.runJob("CREATE_GENRE_PLAYLIST", { genre: payload.genre }, this)
											.then(playlistId => {
												next(null, playlistId);
											})
											.catch(err => {
												next(err);
											});
								} else next(err);
							});
					},

					(playlistId, next) => {
						SongsModule.runJob("GET_ALL_SONGS_WITH_GENRE", { genre: payload.genre }, this)
							.then(response => {
								next(null, playlistId, response.songs);
							})
							.catch(err => {
								console.log(err);
								next(err);
							});
					},

					(playlistId, _songs, next) => {
						const songs = _songs.map(song => {
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

						PlaylistsModule.playlistModel.updateOne({ _id: playlistId }, { $set: { songs } }, err => {
							next(err, playlistId);
						});
					},

					(playlistId, next) => {
						PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
							.then(() => {
								next(null, playlistId);
							})
							.catch(next);
					},

					(playlistId, next) => {
						StationsModule.runJob("GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST", { playlistId }, this)
							.then(response => {
								async.eachLimit(
									response.stationIds,
									1,
									(stationId, next) => {
										PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }, this)
											.then(() => {
												next();
											})
											.catch(err => {
												next(err);
											});
									},
									err => {
										if (err) next(err);
										else next();
									}
								);
							})
							.catch(err => {
								next(err);
							});
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({});
				}
			);
		});
	}

	/**
	 * Gets orphaned genre playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ORPHANED_GENRE_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.find({ type: "genre" }, { songs: false }, (err, playlists) => {
				if (err) reject(new Error(err));
				else {
					const orphanedPlaylists = [];
					async.eachLimit(
						playlists,
						1,
						(playlist, next) => {
							SongsModule.runJob("GET_ALL_SONGS_WITH_GENRE", { genre: playlist.createdFor }, this)
								.then(response => {
									if (response.songs.length === 0) {
										StationsModule.runJob(
											"GET_STATIONS_THAT_AUTOFILL_OR_BLACKLIST_PLAYLIST",
											{ playlistId: playlist._id },
											this
										)
											.then(response => {
												if (response.stationIds.length === 0) orphanedPlaylists.push(playlist);
												next();
											})
											.catch(next);
									} else next();
								})
								.catch(next);
						},
						err => {
							if (err) reject(new Error(err));
							else resolve({ playlists: orphanedPlaylists });
						}
					);
				}
			});
		});
	}

	/**
	 * Deletes all orphaned genre playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_ORPHANED_GENRE_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			PlaylistsModule.runJob("GET_ORPHANED_GENRE_PLAYLISTS", {}, this)
				.then(response => {
					async.eachLimit(
						response.playlists,
						1,
						(playlist, next) => {
							this.publishProgress({ status: "update", message: `Deleting "${playlist._id}"` });
							PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId: playlist._id }, this)
								.then(() => {
									this.log("INFO", "Deleting orphaned genre playlist");
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						err => {
							if (err) reject(new Error(err));
							else resolve({});
						}
					);
				})
				.catch(err => {
					reject(new Error(err));
				});
		});
	}

	/**
	 * Gets a orphaned station playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ORPHANED_STATION_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.find({ type: "station" }, { songs: false }, (err, playlists) => {
				if (err) reject(new Error(err));
				else {
					const orphanedPlaylists = [];
					async.eachLimit(
						playlists,
						1,
						(playlist, next) => {
							StationsModule.runJob("GET_STATION", { stationId: playlist.createdFor }, this)
								.then(station => {
									if (station.playlist !== playlist._id.toString()) {
										orphanedPlaylists.push(playlist);
									}
									next();
								})
								.catch(err => {
									if (err.message === "Station not found") {
										orphanedPlaylists.push(playlist);
										next();
									} else next(err);
								});
						},
						err => {
							if (err) reject(new Error(err));
							else resolve({ playlists: orphanedPlaylists });
						}
					);
				}
			});
		});
	}

	/**
	 * Deletes all orphaned station playlists
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_ORPHANED_STATION_PLAYLISTS() {
		return new Promise((resolve, reject) => {
			PlaylistsModule.runJob("GET_ORPHANED_STATION_PLAYLISTS", {}, this)
				.then(response => {
					async.eachLimit(
						response.playlists,
						1,
						(playlist, next) => {
							this.publishProgress({ status: "update", message: `Deleting "${playlist._id}"` });
							PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId: playlist._id }, this)
								.then(() => {
									this.log("INFO", "Deleting orphaned station playlist");
									next();
								})
								.catch(err => {
									next(err);
								});
						},
						err => {
							if (err) reject(new Error(err));
							else resolve({});
						}
					);
				})
				.catch(err => {
					reject(new Error(err));
				});
		});
	}

	/**
	 * Fills a station playlist with songs
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.stationId - the station id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	AUTOFILL_STATION_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			let originalPlaylist = null;
			async.waterfall(
				[
					next => {
						if (!payload.stationId) next("Please specify a station id");
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
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId: station.playlist }, this)
							.then(playlist => {
								originalPlaylist = playlist;
								next(null, station);
							})
							.catch(err => {
								next(err);
							});
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
									.catch(next);
							},
							err => {
								next(err, station, playlists);
							}
						);
					},

					(station, playlists, next) => {
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
								next(err, station, playlists, blacklist);
							}
						);
					},

					(station, playlists, blacklist, next) => {
						const blacklistedSongs = blacklist
							.flatMap(blacklistedPlaylist => blacklistedPlaylist.songs)
							.reduce(
								(items, item) =>
									items.find(x => x.mediaSource === item.mediaSource) ? [...items] : [...items, item],
								[]
							);
						const includedSongs = playlists
							.flatMap(playlist => playlist.songs)
							.reduce(
								(songs, song) =>
									songs.find(x => x.mediaSource === song.mediaSource) ? [...songs] : [...songs, song],
								[]
							)
							.filter(song => !blacklistedSongs.find(x => x.mediaSource === song.mediaSource));

						next(null, station, includedSongs);
					},

					(station, includedSongs, next) => {
						PlaylistsModule.playlistModel.updateOne(
							{ _id: station.playlist },
							{ $set: { songs: includedSongs } },
							err => {
								next(err, includedSongs);
							}
						);
					},

					(includedSongs, next) => {
						PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId: originalPlaylist._id }, this)
							.then(() => {
								next(null, includedSongs);
							})
							.catch(next);
					},

					(includedSongs, next) => {
						if (originalPlaylist.songs.length === 0 && includedSongs.length > 0)
							StationsModule.runJob("SKIP_STATION", {
								stationId: payload.stationId,
								natural: false,
								skipReason: "other"
							});
						next();
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({});
				}
			);
		});
	}

	/**
	 * Gets a playlist by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						CacheModule.runJob(
							"HGET",
							{
								table: "playlists",
								key: payload.playlistId
							},
							this
						)
							.then(playlist => next(null, playlist))
							.catch(next);
					},

					(playlist, next) => {
						if (playlist)
							PlaylistsModule.playlistModel.exists({ _id: payload.playlistId }, (err, exists) => {
								if (err) next(err);
								else if (exists) next(null, playlist);
								else {
									CacheModule.runJob(
										"HDEL",
										{
											table: "playlists",
											key: payload.playlistId
										},
										this
									)
										.then(() => next())
										.catch(next);
								}
							});
						else PlaylistsModule.playlistModel.findOne({ _id: payload.playlistId }, next);
					},

					(playlist, next) => {
						if (playlist) {
							CacheModule.runJob(
								"HSET",
								{
									table: "playlists",
									key: payload.playlistId,
									value: playlist
								},
								this
							)
								.then(playlist => {
									next(null, playlist);
								})
								.catch(next);
						} else next("Playlist not found");
					}
				],
				(err, playlist) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(playlist);
				}
			);
		});
	}

	/**
	 * Gets a playlist from id from Mongo and updates the cache with it
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to update
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	UPDATE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						PlaylistsModule.playlistModel.findOne({ _id: payload.playlistId }, next);
					},

					(playlist, next) => {
						if (!playlist) {
							CacheModule.runJob("HDEL", {
								table: "playlists",
								key: payload.playlistId
							});

							return next("Playlist not found");
						}

						return CacheModule.runJob(
							"HSET",
							{
								table: "playlists",
								key: payload.playlistId,
								value: playlist
							},
							this
						)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(next);
					}
				],
				(err, playlist) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(playlist);
				}
			);
		});
	}

	/**
	 * Deletes playlist from id from Mongo and cache
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to delete
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						PlaylistsModule.playlistModel.deleteOne({ _id: payload.playlistId }, next);
					},

					(res, next) => {
						CacheModule.runJob(
							"HDEL",
							{
								table: "playlists",
								key: payload.playlistId
							},
							this
						)
							.then(() => next())
							.catch(next);
					},

					next => {
						StationsModule.runJob(
							"REMOVE_AUTOFILLED_OR_BLACKLISTED_PLAYLIST_FROM_STATIONS",
							{ playlistId: payload.playlistId },
							this
						)
							.then(() => {
								next();
							})
							.catch(err => next(err));
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
	 * Searches through playlists
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.query - the query
	 * @param {string} payload.includePrivate - include private playlists
	 * @param {string} payload.includeStation - include station playlists
	 * @param {string} payload.includeUser - include user playlists
	 * @param {string} payload.includeGenre - include genre playlists
	 * @param {string} payload.includeAdmin - include admin playlists
	 * @param {string} payload.includeOwn - include own user playlists
	 * @param {string} payload.userId - the user id of the person requesting
	 * @param {string} payload.includeSongs - include songs
	 * @param {string} payload.page - page (default 1)
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SEARCH(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const types = [];
						if (payload.includeStation) types.push("station");
						if (payload.includeUser) types.push("user");
						if (payload.includeGenre) types.push("genre");
						if (payload.includeAdmin) types.push("admin");
						if (types.length === 0 && !payload.includeOwn) return next("No types have been included.");

						const privacies = ["public"];
						if (payload.includePrivate) privacies.push("private");

						const includeObject = payload.includeSongs ? null : { songs: false };
						const filterArray = [
							{
								displayName: new RegExp(`${payload.query}`, "i"),
								privacy: { $in: privacies },
								type: { $in: types }
							}
						];

						if (payload.includeOwn && payload.userId)
							filterArray.push({
								displayName: new RegExp(`${payload.query}`, "i"),
								type: "user",
								createdBy: payload.userId
							});

						return next(null, filterArray, includeObject);
					},

					(filterArray, includeObject, next) => {
						const page = payload.page ? payload.page : 1;
						const pageSize = 15;
						const skipAmount = pageSize * (page - 1);

						PlaylistsModule.playlistModel.find({ $or: filterArray }).count((err, count) => {
							if (err) next(err);
							else {
								PlaylistsModule.playlistModel
									.find({ $or: filterArray }, includeObject)
									.skip(skipAmount)
									.limit(pageSize)
									.exec((err, playlists) => {
										if (err) next(err);
										else {
											next(null, {
												playlists,
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
						if (data.playlists.length > 0) next(null, data);
						else next("No playlists found");
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
	 * Clears and refills a station playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to clear and refill
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CLEAR_AND_REFILL_STATION_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId } = payload;
			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(err => {
								next(err);
							});
					},

					(playlist, next) => {
						if (playlist.type !== "station") next("This playlist is not a station playlist.");
						else next(null, playlist.createdFor);
					},

					(stationId, next) => {
						PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }, this)
							.then(() => {
								next();
							})
							.catch(err => {
								next(err);
							});
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
	 * Clears and refills a genre playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to clear and refill
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CLEAR_AND_REFILL_GENRE_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId } = payload;
			async.waterfall(
				[
					next => {
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
							.then(playlist => {
								next(null, playlist);
							})
							.catch(err => {
								next(err);
							});
					},

					(playlist, next) => {
						if (playlist.type !== "genre") next("This playlist is not a genre playlist.");
						else next(null, playlist.createdFor);
					},

					(genre, next) => {
						PlaylistsModule.runJob("AUTOFILL_GENRE_PLAYLIST", { genre, createPlaylist: true }, this)
							.then(() => {
								next();
							})
							.catch(err => {
								next(err);
							});
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve();
				}
			);
		});
	}
}

export default new _PlaylistsModule();
