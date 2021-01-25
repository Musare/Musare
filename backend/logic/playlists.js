import async from "async";

import CoreClass from "../core";

let PlaylistsModule;
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

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;

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
					createdAt: Date.now()
				},
				(err, playlist) => {
					if (err) return reject(new Error(err));
					return resolve(playlist._id);
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
