import async from "async";

import CoreClass from "../core";

class PlaylistsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("playlists");
	}

	/**
	 * Initialises the playlists module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		this.cache = this.moduleManager.modules.cache;
		this.db = this.moduleManager.modules.db;
		this.utils = this.moduleManager.modules.utils;

		const playlistModel = await this.db.runJob("GET_MODEL", { modelName: "playlist" });
		const playlistSchema = await this.cache.runJob("GET_SCHEMA", { schemaName: "playlist" });

		this.setStage(2);

		return new Promise((resolve, reject) =>
			async.waterfall(
				[
					next => {
						this.setStage(3);
						this.cache
							.runJob("HGETALL", { table: "playlists" })
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
								playlistModel.findOne({ _id: playlistId }, (err, playlist) => {
									if (err) next(err);
									else if (!playlist) {
										this.cache
											.runJob("HDEL", {
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
						playlistModel.find({}, next);
					},

					(playlists, next) => {
						this.setStage(6);
						async.each(
							playlists,
							(playlist, cb) => {
								this.cache
									.runJob("HSET", {
										table: "playlists",
										key: playlist._id,
										value: playlistSchema(playlist)
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
						const formattedErr = await this.utils.runJob("GET_ERROR", {
							error: err
						});
						reject(new Error(formattedErr));
					} else resolve();
				}
			)
		);
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
			let playlistModel;

			this.db
				.runJob("GET_MODEL", { modelName: "playlist" })
				.then(model => {
					playlistModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						this.cache
							.runJob("HGETALL", { table: "playlists" })
							.then(playlists => {
								next(null, playlists);
							})
							.catch(next);
					},

					(playlists, next) => {
						if (!playlists) return next();

						const playlistIds = Object.keys(playlists);

						return async.each(
							playlistIds,
							(playlistId, next) => {
								playlistModel.findOne({ _id: playlistId }, (err, playlist) => {
									if (err) next(err);
									else if (!playlist) {
										this.cache
											.runJob("HDEL", {
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
						this.cache
							.runJob("HGET", {
								table: "playlists",
								key: payload.playlistId
							})
							.then(playlist => next(null, playlist))
							.catch(next);
					},

					(playlist, next) => {
						if (playlist) return next(true, playlist);
						return playlistModel.findOne({ _id: payload.playlistId }, next);
					},

					(playlist, next) => {
						if (playlist) {
							this.cache
								.runJob("HSET", {
									table: "playlists",
									key: payload.playlistId,
									value: playlist
								})
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
		// playlistId, cb
		return new Promise((resolve, reject) => {
			let playlistModel;

			this.db
				.runJob("GET_MODEL", { modelName: "playlist" })
				.then(model => {
					playlistModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						playlistModel.findOne({ _id: payload.playlistId }, next);
					},

					(playlist, next) => {
						if (!playlist) {
							this.cache.runJob("HDEL", {
								table: "playlists",
								key: payload.playlistId
							});

							return next("Playlist not found");
						}

						return this.cache
							.runJob("HSET", {
								table: "playlists",
								key: payload.playlistId,
								value: playlist
							})
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
		// playlistId, cb
		return new Promise((resolve, reject) => {
			let playlistModel;

			this.db
				.runJob("GET_MODEL", { modelName: "playlist" })
				.then(model => {
					playlistModel = model;
				})
				.catch(console.error);

			return async.waterfall(
				[
					next => {
						playlistModel.deleteOne({ _id: payload.playlistId }, next);
					},

					(res, next) => {
						this.cache
							.runJob("HDEL", {
								table: "playlists",
								key: payload.playlistId
							})
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

export default new PlaylistsModule();
