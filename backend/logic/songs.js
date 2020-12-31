import async from "async";
import mongoose from "mongoose";
import CoreClass from "../core";

let SongsModule;
let CacheModule;
let DBModule;
let UtilsModule;

class _SongsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("songs");

		SongsModule = this;
	}

	/**
	 * Initialises the songs module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;

		const songModel = await DBModule.runJob("GET_MODEL", { modelName: "song" });
		const songSchema = await CacheModule.runJob("GET_SCHEMA", { schemaName: "song" });

		this.setStage(2);

		return new Promise((resolve, reject) =>
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

						const songIds = Object.keys(songs);

						return async.each(
							songIds,
							(songId, next) => {
								songModel.findOne({ songId }, (err, song) => {
									if (err) next(err);
									else if (!song)
										CacheModule.runJob("HDEL", {
											table: "songs",
											key: songId
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
						songModel.find({}, next);
					},

					(songs, next) => {
						this.setStage(5);
						async.each(
							songs,
							(song, next) => {
								CacheModule.runJob("HSET", {
									table: "songs",
									key: song.songId,
									value: songSchema(song)
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
			)
		);
	}

	/**
	 * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.id - the id of the song we are trying to get
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SONG(payload) {
		return new Promise((resolve, reject) => {
			let songModel;

			SongsModule.log("ERROR", "HOW DOES THIS WORK!?!?!??!?!?!?!??!?!??!?!?!?!");
			DBModule.runJob("GET_MODEL", { modelName: "song" }, this)
				.then(model => {
					songModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						if (!mongoose.Types.ObjectId.isValid(payload.id)) return next("Id is not a valid ObjectId.");
						return CacheModule.runJob("HGET", { table: "songs", key: payload.id }, this)
							.then(song => {
								next(null, song);
							})
							.catch(next);
					},

					(song, next) => {
						if (song) return next(true, song);
						return songModel.findOne({ _id: payload.id }, next);
					},

					(song, next) => {
						if (song) {
							CacheModule.runJob(
								"HSET",
								{
									table: "songs",
									key: payload.id,
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
	 * Gets a song by song id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.songId - the mongo id of the song we are trying to get
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_SONG_FROM_ID(payload) {
		return new Promise((resolve, reject) => {
			let songModel;

			SongsModule.log("ERROR", "HOW DOES THIS WORK!?!?!??!?!?!?!??!?!??!?!?!?!");
			DBModule.runJob("GET_MODEL", { modelName: "song" }, this)
				.then(model => {
					songModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						songModel.findOne({ songId: payload.songId }, next);
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
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.songId - the id of the song we are trying to update
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	UPDATE_SONG(payload) {
		// songId, cb
		return new Promise((resolve, reject) => {
			let songModel;

			SongsModule.log("ERROR", "HOW DOES THIS WORK!?!?!??!?!?!?!??!?!??!?!?!?!");
			DBModule.runJob("GET_MODEL", { modelName: "song" }, this)
				.then(model => {
					songModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						songModel.findOne({ _id: payload.songId }, next);
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
							.then(song => {
								next(null, song);
							})
							.catch(next);
					}
				],
				(err, song) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(song);
				}
			);
		});
	}

	/**
	 * Deletes song from id from Mongo and cache
	 *
	 * @param {object} payload - returns an object containing the payload
	 * @param {string} payload.songId - the id of the song we are trying to delete
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	DELETE_SONG(payload) {
		// songId, cb
		return new Promise((resolve, reject) => {
			let songModel;

			SongsModule.log("ERROR", "HOW DOES THIS WORK!?!?!??!?!?!?!??!?!??!?!?!?!");
			DBModule.runJob("GET_MODEL", { modelName: "song" })
				.then(model => {
					songModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						songModel.deleteOne({ songId: payload.songId }, next);
					},

					next => {
						CacheModule.runJob(
							"HDEL",
							{
								table: "songs",
								key: payload.songId
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
			);
		});
	}
}

export default new _SongsModule();
