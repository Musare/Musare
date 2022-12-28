import mongoose from "mongoose";
import async from "async";
import config from "config";

import * as rax from "retry-axios";
import axios from "axios";

import CoreClass from "../core";

let SoundCloudModule;
let CacheModule;
let DBModule;
let MediaModule;
let SongsModule;
let StationsModule;
let PlaylistsModule;
let WSModule;

class RateLimitter {
	/**
	 * Constructor
	 *
	 * @param {number} timeBetween - The time between each allowed YouTube request
	 */
	constructor(timeBetween) {
		this.dateStarted = Date.now();
		this.timeBetween = timeBetween;
	}

	/**
	 * Returns a promise that resolves whenever the ratelimit of a YouTube request is done
	 *
	 * @returns {Promise} - promise that gets resolved when the rate limit allows it
	 */
	continue() {
		return new Promise(resolve => {
			if (Date.now() - this.dateStarted >= this.timeBetween) resolve();
			else setTimeout(resolve, this.dateStarted + this.timeBetween - Date.now());
		});
	}

	/**
	 * Restart the rate limit timer
	 */
	restart() {
		this.dateStarted = Date.now();
	}
}

class _SoundCloudModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("soundcloud");

		SoundCloudModule = this;
	}

	/**
	 * Initialises the soundcloud module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		CacheModule = this.moduleManager.modules.cache;
		DBModule = this.moduleManager.modules.db;
		MediaModule = this.moduleManager.modules.media;
		SongsModule = this.moduleManager.modules.songs;
		StationsModule = this.moduleManager.modules.stations;
		PlaylistsModule = this.moduleManager.modules.playlists;
		WSModule = this.moduleManager.modules.ws;

		// this.youtubeApiRequestModel = this.YoutubeApiRequestModel = await DBModule.runJob("GET_MODEL", {
		// 	modelName: "youtubeApiRequest"
		// });

		this.soundcloudTrackModel = this.SoundCloudTrackModel = await DBModule.runJob("GET_MODEL", {
			modelName: "soundcloudTrack"
		});

		return new Promise(resolve => {
			this.rateLimiter = new RateLimitter(config.get("apis.soundcloud.rateLimit"));
			this.requestTimeout = config.get("apis.soundcloud.requestTimeout");

			this.axios = axios.create();
			this.axios.defaults.raxConfig = {
				instance: this.axios,
				retry: config.get("apis.soundcloud.retryAmount"),
				noResponseRetries: config.get("apis.soundcloud.retryAmount")
			};
			rax.attach(this.axios);

			SoundCloudModule.runJob("GET_TRACK", { identifier: 469902882, createMissing: false })
				.then(res => {
					console.log(57567, res);
				})
				.catch(err => {
					console.log(78768, err);
				});

			resolve();
		});
	}

	/**
	 * Perform SoundCloud API get track request
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_GET_TRACK(payload) {
		return new Promise((resolve, reject) => {
			const { trackId } = payload;

			SoundCloudModule.runJob(
				"API_CALL",
				{
					url: `https://api-v2.soundcloud.com/tracks/${trackId}`
				},
				this
			)
				.then(response => {
					resolve(response);
				})
				.catch(err => {
					reject(err);
				});
		});
	}

	/**
	 * Perform SoundCloud API call
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.url - request url
	 * @param {object} payload.params - request parameters
	 * @param {object} payload.quotaCost - request quotaCost
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_CALL(payload) {
		return new Promise((resolve, reject) => {
			// const { url, params, quotaCost } = payload;
			const { url } = payload;

			const params = {
				client_id: config.get("apis.soundcloud.key")
			};

			SoundCloudModule.axios
				.get(url, {
					params,
					timeout: SoundCloudModule.requestTimeout
				})
				.then(response => {
					if (response.data.error) {
						reject(new Error(response.data.error));
					} else {
						resolve({ response });
					}
				})
				.catch(err => {
					reject(err);
				});
			// }
		});
	}

	/**
	 * Create SoundCloud track
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.soundcloudTrack - the soundcloudTrack object
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CREATE_TRACK(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const { soundcloudTrack } = payload;
						if (typeof soundcloudTrack !== "object") next("Invalid soundcloudTrack type");
						else {
							SoundCloudModule.soundcloudTrackModel.insertMany(soundcloudTrack, next);
						}
					},

					(soundcloudTrack, next) => {
						const mediaSource = `soundcloud:${soundcloudTrack.trackId}`;

						MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource }, this)
							.then(() => next(null, soundcloudTrack))
							.catch(next);
					}
				],
				(err, soundcloudTrack) => {
					if (err) reject(new Error(err));
					else resolve({ soundcloudTrack });
				}
			);
		});
	}

	/**
	 * Get SoundCloud track
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.identifier - the soundcloud track ObjectId or track id
	 * @param {string} payload.createMissing - attempt to fetch and create track if not in db
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_TRACK(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const query = mongoose.isObjectIdOrHexString(payload.identifier)
							? { _id: payload.identifier }
							: { trackId: payload.identifier };
						return SoundCloudModule.soundcloudTrackModel.findOne(query, next);
					},

					(track, next) => {
						if (track) return next(null, track, false);
						if (mongoose.isObjectIdOrHexString(payload.identifier) || !payload.createMissing)
							return next("SoundCloud track not found.");
						return SoundCloudModule.runJob("API_GET_TRACK", { trackId: payload.identifier }, this)
							.then(({ response }) => {
								const { data } = response;
								if (!data || !data.id)
									return next("The specified track does not exist or cannot be publicly accessed.");

								const {
									id,
									title,
									artwork_url: artworkUrl,
									created_at: createdAt,
									duration,
									genre,
									kind,
									license,
									likes_count: likesCount,
									playback_count: playbackCount,
									public: _public,
									tag_list: tagList,
									user_id: userId,
									user
								} = data;

								const soundcloudTrack = {
									trackId: id,
									title,
									artworkUrl,
									soundcloudCreatedAt: new Date(createdAt),
									duration: duration / 1000,
									genre,
									kind,
									license,
									likesCount,
									playbackCount,
									public: _public,
									tagList,
									userId,
									username: user.username
								};

								return next(null, false, soundcloudTrack);
							})
							.catch(next);
					},
					(track, soundcloudTrack, next) => {
						if (track) return next(null, track, true);
						return SoundCloudModule.runJob("CREATE_TRACK", { soundcloudTrack }, this)
							.then(res => {
								if (res.soundcloudTrack.length === 1) next(null, res.soundcloudTrack, false);
								else next("SoundCloud track not found.");
							})
							.catch(next);
					}
				],
				(err, track, existing) => {
					if (err) reject(new Error(err));
					else resolve({ track, existing });
				}
			);
		});
	}
}

export default new _SoundCloudModule();
