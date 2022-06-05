import async from "async";
import CoreClass from "../core";

let MediaModule;
let CacheModule;
let DBModule;
let UtilsModule;
let YouTubeModule;
let SongsModule;
let WSModule;

class _MediaModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("media");

		MediaModule = this;
	}

	/**
	 * Initialises the media module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;
		YouTubeModule = this.moduleManager.modules.youtube;
		SongsModule = this.moduleManager.modules.songs;
		WSModule = this.moduleManager.modules.ws;

		this.RatingsModel = await DBModule.runJob("GET_MODEL", { modelName: "ratings" });
		this.RatingsSchemaCache = await CacheModule.runJob("GET_SCHEMA", { schemaName: "ratings" });
		this.ImportJobModel = await DBModule.runJob("GET_MODEL", { modelName: "importJob" });

		this.setStage(2);

		return new Promise((resolve, reject) => {
			CacheModule.runJob("SUB", {
				channel: "importJob.updated",
				cb: importJob => {
					WSModule.runJob("EMIT_TO_ROOM", {
						room: "admin.import",
						args: ["event:admin.importJob.updated", { data: { importJob } }]
					});
				}
			});

			CacheModule.runJob("SUB", {
				channel: "importJob.removed",
				cb: jobId => {
					WSModule.runJob("EMIT_TO_ROOM", {
						room: "admin.import",
						args: ["event:admin.importJob.removed", { data: { jobId } }]
					});
				}
			});

			async.waterfall(
				[
					next => {
						this.setStage(2);
						CacheModule.runJob("HGETALL", { table: "ratings" })
							.then(ratings => {
								next(null, ratings);
							})
							.catch(next);
					},

					(ratings, next) => {
						this.setStage(3);

						if (!ratings) return next();

						const youtubeIds = Object.keys(ratings);

						return async.each(
							youtubeIds,
							(youtubeId, next) => {
								MediaModule.RatingsModel.findOne({ youtubeId }, (err, rating) => {
									if (err) next(err);
									else if (!rating)
										CacheModule.runJob("HDEL", {
											table: "ratings",
											key: youtubeId
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
						MediaModule.RatingsModel.find({}, next);
					},

					(ratings, next) => {
						this.setStage(5);
						async.each(
							ratings,
							(rating, next) => {
								CacheModule.runJob("HSET", {
									table: "ratings",
									key: rating.youtubeId,
									value: MediaModule.RatingsSchemaCache(rating)
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
	 * Recalculates dislikes and likes
	 *
	 * @param {object} payload - returns an object containing the payload
	 * @param {string} payload.youtubeId - the youtube id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async RECALCULATE_RATINGS(payload) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						playlistModel.countDocuments(
							{ songs: { $elemMatch: { youtubeId: payload.youtubeId } }, type: "user-liked" },
							(err, likes) => {
								if (err) return next(err);
								return next(null, likes);
							}
						);
					},

					(likes, next) => {
						playlistModel.countDocuments(
							{ songs: { $elemMatch: { youtubeId: payload.youtubeId } }, type: "user-disliked" },
							(err, dislikes) => {
								if (err) return next(err);
								return next(err, { likes, dislikes });
							}
						);
					},

					({ likes, dislikes }, next) => {
						MediaModule.RatingsModel.findOneAndUpdate(
							{ youtubeId: payload.youtubeId },
							{
								$set: {
									likes,
									dislikes
								}
							},
							{ new: true, upsert: true },
							next
						);
					},

					(ratings, next) => {
						CacheModule.runJob(
							"HSET",
							{
								table: "ratings",
								key: payload.youtubeId,
								value: ratings
							},
							this
						)
							.then(ratings => next(null, ratings))
							.catch(next);
					}
				],
				(err, { likes, dislikes }) => {
					if (err) return reject(new Error(err));
					return resolve({ likes, dislikes });
				}
			);
		});
	}

	/**
	 * Recalculates all dislikes and likes
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	RECALCULATE_ALL_RATINGS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.find({}, { youtubeId: true }, next);
					},

					(songs, next) => {
						YouTubeModule.youtubeVideoModel.find({}, { youtubeId: true }, (err, videos) => {
							if (err) next(err);
							else
								next(null, [
									...songs.map(song => song.youtubeId),
									...videos.map(video => video.youtubeId)
								]);
						});
					},

					(youtubeIds, next) => {
						async.eachLimit(
							youtubeIds,
							2,
							(youtubeId, next) => {
								MediaModule.runJob("RECALCULATE_RATINGS", { youtubeId }, this)
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
					if (err) return reject(new Error(err));
					return resolve();
				}
			);
		});
	}

	/**
	 * Gets ratings by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.youtubeId - the youtube id
	 * @param {string} payload.createMissing - whether to create missing ratings
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_RATINGS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next =>
						CacheModule.runJob("HGET", { table: "ratings", key: payload.youtubeId }, this)
							.then(ratings => next(null, ratings))
							.catch(next),

					(ratings, next) => {
						if (ratings) return next(true, ratings);
						return MediaModule.RatingsModel.findOne({ youtubeId: payload.youtubeId }, next);
					},

					(ratings, next) => {
						if (ratings)
							return CacheModule.runJob(
								"HSET",
								{
									table: "ratings",
									key: payload.youtubeId,
									value: ratings
								},
								this
							).then(ratings => next(true, ratings));

						if (!payload.createMissing) return next("Ratings not found.");

						return MediaModule.runJob("RECALCULATE_RATINGS", { youtubeId: payload.youtubeId }, this)
							.then(() => next())
							.catch(next);
					},

					next =>
						MediaModule.runJob("GET_RATINGS", { youtubeId: payload.youtubeId }, this)
							.then(res => next(null, res.ratings))
							.catch(next)
				],
				(err, ratings) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ ratings });
				}
			);
		});
	}

	/**
	 * Remove ratings by id from the cache and Mongo
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.youtubeIds - the youtube id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_RATINGS(payload) {
		return new Promise((resolve, reject) => {
			let { youtubeIds } = payload;
			if (!Array.isArray(youtubeIds)) youtubeIds = [youtubeIds];

			async.eachLimit(
				youtubeIds,
				1,
				(youtubeId, next) => {
					async.waterfall(
						[
							next => {
								MediaModule.RatingsModel.deleteOne({ youtubeId }, err => {
									if (err) next(err);
									else next();
								});
							},

							next => {
								CacheModule.runJob("HDEL", { table: "ratings", key: youtubeId }, this)
									.then(() => {
										next();
									})
									.catch(next);
							}
						],
						next
					);
				},
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve();
				}
			);
		});
	}

	/**
	 * Get song or youtube video by youtubeId
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.youtubeId - the youtube id of the song/video
	 * @param {string} payload.userId - the user id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_MEDIA(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.findOne({ youtubeId: payload.youtubeId }, next);
					},

					(song, next) => {
						if (song && song.duration > 0) next(true, song);
						else {
							YouTubeModule.runJob(
								"GET_VIDEO",
								{ identifier: payload.youtubeId, createMissing: true },
								this
							)
								.then(response => {
									const { youtubeId, title, author, duration } = response.video;
									next(null, song, { youtubeId, title, artists: [author], duration });
								})
								.catch(next);
						}
					},

					(song, youtubeVideo, next) => {
						if (song && song.duration <= 0) {
							song.duration = youtubeVideo.duration;
							song.save({ validateBeforeSave: true }, err => {
								if (err) next(err, song);
								next(null, song);
							});
						} else {
							next(null, {
								...youtubeVideo,
								skipDuration: 0,
								requestedBy: payload.userId,
								requestedAt: Date.now(),
								verified: false
							});
						}
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
	 * Remove import job by id from Mongo
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.jobIds - the job ids
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	UPDATE_IMPORT_JOBS(payload) {
		return new Promise((resolve, reject) => {
			let { jobIds } = payload;
			if (!Array.isArray(jobIds)) jobIds = [jobIds];

			async.waterfall(
				[
					next => {
						MediaModule.ImportJobModel.find({ _id: { $in: jobIds } }, next);
					},

					(importJobs, next) => {
						async.eachLimit(
							importJobs,
							1,
							(importJob, next) => {
								CacheModule.runJob("PUB", {
									channel: "importJob.updated",
									value: importJob
								})
									.then(() => next())
									.catch(next);
							},
							err => {
								if (err) next(err);
								else next(null, importJobs);
							}
						);
					}
				],
				(err, importJobs) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ importJobs });
				}
			);
		});
	}

	/**
	 * Remove import job by id from Mongo
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.jobIds - the job ids
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_IMPORT_JOBS(payload) {
		return new Promise((resolve, reject) => {
			let { jobIds } = payload;
			if (!Array.isArray(jobIds)) jobIds = [jobIds];

			async.waterfall(
				[
					next => {
						MediaModule.ImportJobModel.deleteMany({ _id: { $in: jobIds } }, err => {
							if (err) next(err);
							else next();
						});
					},

					next => {
						async.eachLimit(
							jobIds,
							1,
							(jobId, next) => {
								CacheModule.runJob("PUB", {
									channel: "importJob.removed",
									value: jobId
								})
									.then(() => next())
									.catch(next);
							},
							next
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
}

export default new _MediaModule();
