import async from "async";

import CoreClass from "../core";

let PlaylistsModule;
let StationsModule;
let SongsModule;
let CacheModule;
let DBModule;
let UtilsModule;

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

		this.playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" });
		this.playlistSchemaCache = await CacheModule.runJob("GET_SCHEMA", { schemaName: "playlist" });

		this.setStage(2);

		return new Promise((resolve, reject) =>
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
					} else resolve();
				}
			)
		);
	}

	/**
	 * Creates a playlist that is not generated or editable by a user e.g. liked songs playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.userId - the id of the user to create the playlist for
	 * @param {string} payload.displayName - the display name of the playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	CREATE_READ_ONLY_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.create(
				{
					isUserModifiable: false,
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
								isUserModifiable: false,
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
	 * @param {string} payload.song - the song
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	ADD_SONG_TO_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const song = {
				_id: payload.song._id,
				songId: payload.song.songId,
				title: payload.song.title,
				duration: payload.song.duration
			};

			PlaylistsModule.playlistModel.updateOne(
				{ _id: payload.playlistId },
				{ $push: { songs: song } },
				{ runValidators: true },
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
	 * Deletes a song from a playlist based on the songId
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the playlist id
	 * @param {string} payload.songId - the songId
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_SONG_FROM_PLAYLIST_BY_SONGID(payload) {
		return new Promise((resolve, reject) => {
			PlaylistsModule.playlistModel.updateOne(
				{ _id: payload.playlistId },
				{ $pull: { songs: { songId: payload.songId } } },
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
								next(null, { playlist: response.playlist });
							})
							.catch(err => {
								if (err.message === "Playlist not found") {
									PlaylistsModule.runJob("CREATE_GENRE_PLAYLIST", { genre: payload.genre }, this)
										.then(playlistId => {
											next(null, { playlist: { _id: playlistId, songs: [] } });
										})
										.catch(err => {
											next(err);
										});
								} else next(err);
							});
					},

					(data, next) => {
						SongsModule.runJob("GET_ALL_SONGS_WITH_GENRE", { genre: payload.genre }, this)
							.then(response => {
								data.songs = response.songs;
								next(null, data);
							})
							.catch(err => {
								console.log(err);
								next(err);
							});
					},

					(data, next) => {
						data.songsToDelete = [];
						data.songsToAdd = [];

						data.playlist.songs.forEach(playlistSong => {
							const found = data.songs.find(song => playlistSong.songId === song.songId);
							if (!found) data.songsToDelete.push(playlistSong);
						});

						data.songs.forEach(song => {
							const found = data.playlist.songs.find(playlistSong => song.songId === playlistSong.songId);
							if (!found) data.songsToAdd.push(song);
						});

						next(null, data);
					},

					(data, next) => {
						const promises = [];
						data.songsToAdd.forEach(song => {
							promises.push(
								PlaylistsModule.runJob(
									"ADD_SONG_TO_PLAYLIST",
									{ playlistId: data.playlist._id, song },
									this
								)
							);
						});
						data.songsToDelete.forEach(song => {
							promises.push(
								PlaylistsModule.runJob(
									"DELETE_SONG_FROM_PLAYLIST_BY_SONGID",
									{
										playlistId: data.playlist._id,
										songId: song.songId
									},
									this
								)
							);
						});

						Promise.allSettled(promises)
							.then(() => {
								next(null, data.playlist._id);
							})
							.catch(err => {
								next(err);
							});
					},

					(playlistId, next) => {
						StationsModule.runJob("GET_STATIONS_THAT_INCLUDE_OR_EXCLUDE_PLAYLIST", { playlistId })
							.then(response => {
								response.stationIds.forEach(stationId => {
									PlaylistsModule.runJob("AUTOFILL_STATION_PLAYLIST", { stationId }).then().catch();
								});
							})
							.catch();
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
								.then(() => {
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
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId: station.playlist2 }, this)
							.then(() => {
								next(null, station);
							})
							.catch(err => {
								next(err);
							});
					},

					(station, next) => {
						const includedPlaylists = [];
						async.eachLimit(
							station.includedPlaylists,
							1,
							(playlistId, next) => {
								PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
									.then(playlist => {
										includedPlaylists.push(playlist);
										next();
									})
									.catch(next);
							},
							err => {
								next(err, station, includedPlaylists);
							}
						);
					},

					(station, includedPlaylists, next) => {
						const excludedPlaylists = [];
						async.eachLimit(
							station.excludedPlaylists,
							1,
							(playlistId, next) => {
								PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
									.then(playlist => {
										excludedPlaylists.push(playlist);
										next();
									})
									.catch(next);
							},
							err => {
								next(err, station, includedPlaylists, excludedPlaylists);
							}
						);
					},

					(station, includedPlaylists, excludedPlaylists, next) => {
						const excludedSongs = excludedPlaylists
							.flatMap(excludedPlaylist => excludedPlaylist.songs)
							.reduce(
								(items, item) =>
									items.find(x => x.songId === item.songId) ? [...items] : [...items, item],
								[]
							);
						const includedSongs = includedPlaylists
							.flatMap(includedPlaylist => includedPlaylist.songs)
							.reduce(
								(songs, song) =>
									songs.find(x => x.songId === song.songId) ? [...songs] : [...songs, song],
								[]
							)
							.filter(song => !excludedSongs.find(x => x.songId === song.songId));

						next(null, station, includedSongs);
					},

					(station, includedSongs, next) => {
						PlaylistsModule.playlistModel.updateOne(
							{ _id: station.playlist2 },
							{ $set: { songs: includedSongs } },
							next
						);
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
		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						CacheModule.runJob("HGETALL", { table: "playlists" }, this)
							.then(playlists => next(null, playlists))
							.catch(next);
					},

					(playlists, next) => {
						if (!playlists) return next();

						const playlistIds = Object.keys(playlists);

						return async.each(
							playlistIds,
							(playlistId, next) => {
								PlaylistsModule.playlistModel.findOne({ _id: playlistId }, (err, playlist) => {
									if (err) next(err);
									else if (!playlist) {
										CacheModule.runJob(
											"HDEL",
											{
												table: "playlists",
												key: playlistId
											},
											this
										)
											.then(() => next())
											.catch(next);
									} else next();
								});
							},
							next
						);
					},

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
						if (playlist) return next(true, playlist);
						return PlaylistsModule.playlistModel.findOne({ _id: payload.playlistId }, next);
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
			)
		);
	}

	/**
	 * Gets a playlist from id from Mongo and updates the cache with it
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to update
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	UPDATE_PLAYLIST(payload) {
		// playlistId, cb
		return new Promise((resolve, reject) =>
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
			)
		);
	}

	/**
	 * Deletes playlist from id from Mongo and cache
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.playlistId - the id of the playlist we are trying to delete
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	DELETE_PLAYLIST(payload) {
		// playlistId, cb
		return new Promise((resolve, reject) =>
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
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve();
				}
			)
		);
	}
}

export default new _PlaylistsModule();
