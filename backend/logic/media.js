import async from "async";
import config from "config";
import CoreClass from "../core";

let MediaModule;
let CacheModule;
let DBModule;
let UtilsModule;
let YouTubeModule;
let SoundCloudModule;
let SpotifyModule;
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
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		this.setStage(1);

		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		UtilsModule = this.moduleManager.modules.utils;
		YouTubeModule = this.moduleManager.modules.youtube;
		SoundCloudModule = this.moduleManager.modules.soundcloud;
		SpotifyModule = this.moduleManager.modules.spotify;
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

						const mediaSources = Object.keys(ratings);

						return async.each(
							mediaSources,
							(mediaSource, next) => {
								MediaModule.RatingsModel.findOne({ mediaSource }, (err, rating) => {
									if (err) next(err);
									else if (!rating)
										CacheModule.runJob("HDEL", {
											table: "ratings",
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
						MediaModule.RatingsModel.find({}, next);
					},

					(ratings, next) => {
						this.setStage(5);
						async.each(
							ratings,
							(rating, next) => {
								CacheModule.runJob("HSET", {
									table: "ratings",
									key: rating.mediaSource,
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
	 * @param {object} payload - returns an object containing the payload
	 * @param {string} payload.mediaSource - the media source
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async RECALCULATE_RATINGS(payload) {
		const playlistModel = await DBModule.runJob("GET_MODEL", { modelName: "playlist" }, this);

		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						playlistModel.countDocuments(
							{ songs: { $elemMatch: { mediaSource: payload.mediaSource } }, type: "user-liked" },
							(err, likes) => {
								if (err) return next(err);
								return next(null, likes);
							}
						);
					},

					(likes, next) => {
						playlistModel.countDocuments(
							{ songs: { $elemMatch: { mediaSource: payload.mediaSource } }, type: "user-disliked" },
							(err, dislikes) => {
								if (err) return next(err);
								return next(err, { likes, dislikes });
							}
						);
					},

					({ likes, dislikes }, next) => {
						MediaModule.RatingsModel.findOneAndUpdate(
							{ mediaSource: payload.mediaSource },
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
								key: payload.mediaSource,
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
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	RECALCULATE_ALL_RATINGS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.find({}, { mediaSource: true }, next);
					},

					(songs, next) => {
						// TODO support spotify
						YouTubeModule.youtubeVideoModel.find({}, { youtubeId: true }, (err, videos) => {
							if (err) next(err);
							else
								next(null, [
									...songs.map(song => song.mediaSource),
									...videos.map(video => `youtube:${video.youtubeId}`)
								]);
						});
					},

					(mediaSources, next) => {
						async.eachLimit(
							mediaSources,
							2,
							(mediaSource, next) => {
								this.publishProgress({
									status: "update",
									message: `Recalculating ratings for ${mediaSource}`
								});
								MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource }, this)
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
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.mediaSource - the media source
	 * @param {string} payload.createMissing - whether to create missing ratings
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_RATINGS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next =>
						CacheModule.runJob("HGET", { table: "ratings", key: payload.mediaSource }, this)
							.then(ratings => next(null, ratings))
							.catch(next),

					(ratings, next) => {
						if (ratings) return next(true, ratings);
						return MediaModule.RatingsModel.findOne({ mediaSource: payload.mediaSource }, next);
					},

					(ratings, next) => {
						if (ratings)
							return CacheModule.runJob(
								"HSET",
								{
									table: "ratings",
									key: payload.mediaSource,
									value: ratings
								},
								this
							).then(ratings => next(true, ratings));

						if (!payload.createMissing) return next("Ratings not found.");

						return MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource: payload.mediaSource }, this)
							.then(() => next())
							.catch(next);
					},

					next =>
						MediaModule.runJob("GET_RATINGS", { mediaSource: payload.mediaSource }, this)
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
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.mediaSources - the media source
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_RATINGS(payload) {
		return new Promise((resolve, reject) => {
			let { mediaSources } = payload;
			if (!Array.isArray(mediaSources)) mediaSources = [mediaSources];

			async.eachLimit(
				mediaSources,
				1,
				(mediaSource, next) => {
					async.waterfall(
						[
							next => {
								MediaModule.RatingsModel.deleteOne({ mediaSource }, err => {
									if (err) next(err);
									else next();
								});
							},

							next => {
								CacheModule.runJob("HDEL", { table: "ratings", key: mediaSource }, this)
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
	 * Get song or youtube video by mediaSource
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.mediaSource - the media source of the song/video
	 * @param {string} payload.userId - the user id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_MEDIA(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SongsModule.SongModel.findOne({ mediaSource: payload.mediaSource }, next);
					},

					(song, next) => {
						if (song && song.duration > 0) return next(true, song);

						if (payload.mediaSource.startsWith("youtube:")) {
							const youtubeId = payload.mediaSource.split(":")[1];

							return YouTubeModule.runJob(
								"GET_VIDEOS",
								{ identifiers: [youtubeId], createMissing: true },
								this
							)
								.then(response => {
									if (response.videos.length === 0) {
										next("Media not found.");
										return;
									}
									const { youtubeId, title, author, duration } = response.videos[0];
									next(null, song, {
										mediaSource: `youtube:${youtubeId}`,
										title,
										artists: [author],
										duration
									});
								})
								.catch(next);
						}

						if (config.get("experimental.soundcloud")) {
							if (payload.mediaSource.startsWith("soundcloud:")) {
								const trackId = payload.mediaSource.split(":")[1];

								return SoundCloudModule.runJob(
									"GET_TRACK",
									{ identifier: trackId, createMissing: true },
									this
								)
									.then(response => {
										const { trackId, title, username, artworkUrl, duration } = response.track;
										next(null, song, {
											mediaSource: `soundcloud:${trackId}`,
											title,
											artists: [username],
											thumbnail: artworkUrl,
											duration
										});
									})
									.catch(next);
							}

							if (payload.mediaSource.indexOf("soundcloud.com") !== -1) {
								return SoundCloudModule.runJob(
									"GET_TRACK_FROM_URL",
									{ identifier: payload.mediaSource, createMissing: true },
									this
								)
									.then(response => {
										const { trackId, title, username, artworkUrl, duration } = response.track;
										next(null, song, {
											mediaSource: `soundcloud:${trackId}`,
											title,
											artists: [username],
											thumbnail: artworkUrl,
											duration
										});
									})
									.catch(next);
							}
						}

						if (config.get("experimental.spotify") && payload.mediaSource.startsWith("spotify:")) {
							const trackId = payload.mediaSource.split(":")[1];

							return SpotifyModule.runJob("GET_TRACK", { identifier: trackId, createMissing: true }, this)
								.then(response => {
									const { trackId, name, artists, albumImageUrl, duration } = response.track;
									next(null, song, {
										mediaSource: `spotify:${trackId}`,
										title: name,
										artists,
										thumbnail: albumImageUrl,
										duration
									});
								})
								.catch(next);
						}

						return next("Invalid media source provided.");
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
	 * Gets media from media sources
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.mediaSources - the media sources
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_MEDIA_FROM_MEDIA_SOURCES(payload) {
		return new Promise((resolve, reject) => {
			const songMap = {};
			const youtubeMediaSources = payload.mediaSources.filter(mediaSource => mediaSource.startsWith("youtube:"));
			const soundcloudMediaSources = payload.mediaSources.filter(mediaSource =>
				mediaSource.startsWith("soundcloud:")
			);

			async.waterfall(
				[
					next => {
						const allPromises = [];

						youtubeMediaSources.forEach(mediaSource => {
							const youtubeId = mediaSource.split(":")[1];

							const promise = YouTubeModule.runJob(
								"GET_VIDEOS",
								{ identifiers: [youtubeId], createMissing: true },
								this
							)
								.then(response => {
									const { youtubeId, title, author, duration } = response.videos[0];
									songMap[mediaSource] = {
										mediaSource: `youtube:${youtubeId}`,
										title,
										artists: [author],
										duration
									};
								})
								.catch(err => {
									MediaModule.log(
										"ERROR",
										`Failed to get media in GET_MEDIA_FROM_MEDIA_SOURCES with mediaSource ${mediaSource} and error`,
										typeof err === "string" ? err : err.message
									);
								});

							allPromises.push(promise);
						});

						if (config.get("experimental.soundcloud"))
							soundcloudMediaSources.forEach(mediaSource => {
								const trackId = mediaSource.split(":")[1];

								const promise = SoundCloudModule.runJob(
									"GET_TRACK",
									{ identifier: trackId, createMissing: true },
									this
								)
									.then(response => {
										const { trackId, title, username, artworkUrl, duration } = response.track;
										songMap[mediaSource] = {
											mediaSource: `soundcloud:${trackId}`,
											title,
											artists: [username],
											thumbnail: artworkUrl,
											duration
										};
									})
									.catch(err => {
										MediaModule.log(
											"ERROR",
											`Failed to get media in GET_MEDIA_FROM_MEDIA_SOURCES with mediaSource ${mediaSource} and error`,
											typeof err === "string" ? err : err.message
										);
									});

								allPromises.push(promise);
							});

						Promise.allSettled(allPromises).then(() => {
							next();
						});
					}
				],
				err => {
					if (err && err !== true) return reject(new Error(err));
					return resolve(songMap);
				}
			);
		});
	}

	/**
	 * Remove import job by id from Mongo
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
