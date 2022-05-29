import async from "async";
import CoreClass from "../core";

let RatingsModule;
let CacheModule;
let DBModule;
let UtilsModule;
let YouTubeModule;
let SongsModule;

class _RatingsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("ratings");

		RatingsModule = this;
	}

	/**
	 * Initialises the ratings module
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

		this.RatingsModel = await DBModule.runJob("GET_MODEL", { modelName: "ratings" });
		this.RatingsSchemaCache = await CacheModule.runJob("GET_SCHEMA", { schemaName: "ratings" });

		this.setStage(2);

		return new Promise((resolve, reject) => {
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
								RatingsModule.RatingsModel.findOne({ youtubeId }, (err, rating) => {
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
						RatingsModule.RatingsModel.find({}, next);
					},

					(ratings, next) => {
						this.setStage(5);
						async.each(
							ratings,
							(rating, next) => {
								CacheModule.runJob("HSET", {
									table: "ratings",
									key: rating.youtubeId,
									value: RatingsModule.RatingsSchemaCache(rating)
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
						RatingsModule.RatingsModel.updateOne(
							{ youtubeId: payload.youtubeId },
							{
								$set: {
									likes,
									dislikes
								}
							},
							{ upsert: true },
							err => next(err, { likes, dislikes })
						);
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
								RatingsModule.runJob("RECALCULATE_RATINGS", { youtubeId }, this)
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
						return RatingsModule.RatingsModel.findOne({ youtubeId: payload.youtubeId }, next);
					},

					(ratings, next) => {
						if (ratings) {
							CacheModule.runJob(
								"HSET",
								{
									table: "ratings",
									key: payload.youtubeId,
									value: ratings
								},
								this
							).then(ratings => next(null, ratings));
						} else next("Ratings not found.");
					}
				],
				(err, ratings) => {
					if (err && err !== true) return reject(new Error(err));
					return resolve({ ratings });
				}
			);
		});
	}
}

export default new _RatingsModule();
