import mongoose from "mongoose";
import async from "async";
import config from "config";
import sckey from "soundcloud-key-fetch";

import * as rax from "retry-axios";
import axios from "axios";

import CoreClass from "../core";

let SoundCloudModule;
let DBModule;
let CacheModule;
let MediaModule;

const soundcloudTrackObjectToMusareTrackObject = soundcloudTrackObject => {
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
		user,
		track_format: trackFormat,
		permalink,
		monetization_model: monetizationModel,
		policy,
		streamable,
		sharing,
		state,
		embeddable_by: embeddableBy
	} = soundcloudTrackObject;

	return {
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
		username: user.username,
		userPermalink: user.permalink,
		trackFormat,
		permalink,
		monetizationModel,
		policy,
		streamable,
		sharing,
		state,
		embeddableBy
	};
};

class RateLimitter {
	/**
	 * Constructor
	 * @param {number} timeBetween - The time between each allowed YouTube request
	 */
	constructor(timeBetween) {
		this.dateStarted = Date.now();
		this.timeBetween = timeBetween;
	}

	/**
	 * Returns a promise that resolves whenever the ratelimit of a YouTube request is done
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
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		DBModule = this.moduleManager.modules.db;
		CacheModule = this.moduleManager.modules.cache;
		MediaModule = this.moduleManager.modules.media;

		this.soundcloudTrackModel = this.SoundCloudTrackModel = await DBModule.runJob("GET_MODEL", {
			modelName: "soundcloudTrack"
		});

		return new Promise((resolve, reject) => {
			this.rateLimiter = new RateLimitter(config.get("apis.soundcloud.rateLimit"));
			this.requestTimeout = config.get("apis.soundcloud.requestTimeout");

			this.axios = axios.create();
			this.axios.defaults.raxConfig = {
				instance: this.axios,
				retry: config.get("apis.soundcloud.retryAmount"),
				noResponseRetries: config.get("apis.soundcloud.retryAmount")
			};
			rax.attach(this.axios);

			this.apiKey = null;

			SoundCloudModule.runJob("TEST_SOUNDCLOUD_API_KEY", {}, null, -1)
				.then(result => {
					if (result) {
						resolve();
						return;
					}

					SoundCloudModule.runJob("GENERATE_SOUNDCLOUD_API_KEY", {}, null, -1)
						.then(() => {
							resolve();
						})
						.catch(reject);
				})
				.catch(reject);
		});
	}

	/**
	 * Generates/fetches a new SoundCloud API key
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GENERATE_SOUNDCLOUD_API_KEY() {
		return new Promise((resolve, reject) => {
			this.log("INFO", "Fetching new SoundCloud API key.");
			sckey
				.fetchKey()
				.then(soundcloudApiKey => {
					if (!soundcloudApiKey) {
						this.log("ERROR", "Couldn't fetch new SoundCloud API key.");
						reject(new Error("Couldn't fetch SoundCloud key."));
						return;
					}

					SoundCloudModule.soundcloudApiKey = soundcloudApiKey;

					CacheModule.runJob("SET", { key: "soundcloudApiKey", value: soundcloudApiKey }, this)
						.then(() => {
							SoundCloudModule.runJob("TEST_SOUNDCLOUD_API_KEY", {}, this).then(result => {
								if (!result) {
									this.log("ERROR", "Fetched SoundCloud API key is invalid.");
									reject(new Error("SoundCloud key isn't valid."));
								} else {
									this.log("INFO", "Fetched new valid SoundCloud API key.");
									resolve();
								}
							});
						})
						.catch(err => {
							this.log("ERROR", `Couldn't set new SoundCloud API key in cache. Error: ${err.message}`);
							reject(err);
						});
				})
				.catch(err => {
					this.log("ERROR", `Couldn't fetch new SoundCloud API key. Error: ${err.message}`);
					reject(new Error("Couldn't fetch SoundCloud key."));
				});
		});
	}

	/**
	 * Tests the stored SoundCloud API key
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	TEST_SOUNDCLOUD_API_KEY() {
		return new Promise((resolve, reject) => {
			this.log("INFO", "Testing SoundCloud API key.");
			CacheModule.runJob("GET", { key: "soundcloudApiKey" }, this).then(soundcloudApiKey => {
				if (!soundcloudApiKey) {
					this.log("ERROR", "No SoundCloud API key found in cache.");
					resolve(false);
					return;
				}

				SoundCloudModule.soundcloudApiKey = soundcloudApiKey;

				sckey
					.testKey(soundcloudApiKey)
					.then(res => {
						this.log("INFO", `Tested SoundCloud API key. Result: ${res}`);
						resolve(res);
					})
					.catch(err => {
						this.log("ERROR", `Testing SoundCloud API key error: ${err.message}`);
						reject(err);
					});
			});
		});
	}

	/**
	 * Perform SoundCloud API get track request
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.trackId - the SoundCloud track id to get
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
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.url - request url
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_CALL(payload) {
		return new Promise((resolve, reject) => {
			const { url } = payload;

			const { soundcloudApiKey } = SoundCloudModule;

			const params = {
				client_id: soundcloudApiKey
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
	 * @param {object} payload - an object containing the payload
	 * @param {object} payload.soundcloudTrack - the soundcloudTrack object
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

					(soundcloudTracks, next) => {
						const mediaSources = soundcloudTracks.map(
							soundcloudTrack => `soundcloud:${soundcloudTrack.trackId}`
						);
						async.eachLimit(
							mediaSources,
							2,
							(mediaSource, next) => {
								MediaModule.runJob("RECALCULATE_RATINGS", { mediaSource }, this)
									.then(() => next())
									.catch(next);
							},
							err => {
								if (err) next(err);
								else next(null, soundcloudTracks);
							}
						);
					}
				],
				(err, soundcloudTracks) => {
					if (err) reject(new Error(err));
					else resolve({ soundcloudTracks });
				}
			);
		});
	}

	/**
	 * Get SoundCloud track
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.identifier - the soundcloud track ObjectId or track id
	 * @param {boolean} payload.createMissing - attempt to fetch and create track if not in db
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

								const soundcloudTrack = soundcloudTrackObjectToMusareTrackObject(data);

								return next(null, false, soundcloudTrack);
							})
							.catch(next);
					},
					(track, soundcloudTrack, next) => {
						if (track) return next(null, track, true);
						return SoundCloudModule.runJob("CREATE_TRACK", { soundcloudTrack }, this)
							.then(res => {
								if (res.soundcloudTracks.length === 1) next(null, res.soundcloudTracks[0], false);
								else next("SoundCloud track not found.");
							})
							.catch(next);
					}
				],
				(err, track, existing) => {
					if (err) reject(new Error(err));
					else if (track.policy === "SNIP") reject(new Error("Track is premium-only."));
					else resolve({ track, existing });
				}
			);
		});
	}

	/**
	 * Tries to get a SoundCloud track from a URL
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.identifier - the SoundCloud track URL
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_TRACK_FROM_URL(payload) {
		return new Promise((resolve, reject) => {
			const scRegex =
				/soundcloud\.com\/(?<userPermalink>[A-Za-z0-9]+([-_][A-Za-z0-9]+)*)\/(?<permalink>[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*)/;

			async.waterfall(
				[
					next => {
						const match = scRegex.exec(payload.identifier);

						if (!match || !match.groups) {
							next("Invalid SoundCloud URL.");
							return;
						}

						const { userPermalink, permalink } = match.groups;

						SoundCloudModule.soundcloudTrackModel.findOne({ userPermalink, permalink }, next);
					},

					(_dbTrack, next) => {
						if (_dbTrack) {
							next(null, _dbTrack, true);
							return;
						}

						SoundCloudModule.runJob("API_RESOLVE", { url: payload.identifier }, this)
							.then(({ response }) => {
								const { data } = response;
								if (!data || !data.id) {
									next("The provided URL does not exist or cannot be accessed.");
									return;
								}

								if (data.kind !== "track") {
									next(`Invalid URL provided. Kind got: ${data.kind}.`);
									return;
								}

								// TODO get more data here

								const { id: trackId } = data;

								SoundCloudModule.soundcloudTrackModel.findOne({ trackId }, (err, dbTrack) => {
									if (err) next(err);
									else if (dbTrack) {
										next(null, dbTrack, true);
									} else {
										const soundcloudTrack = soundcloudTrackObjectToMusareTrackObject(data);

										SoundCloudModule.runJob("CREATE_TRACK", { soundcloudTrack }, this)
											.then(res => {
												if (res.soundcloudTracks.length === 1)
													next(null, res.soundcloudTracks[0], false);
												else next("SoundCloud track not found.");
											})
											.catch(next);
									}
								});
							})
							.catch(next);
					}
				],
				(err, track, existing) => {
					if (err) reject(new Error(err));
					else if (track.policy === "SNIP") reject(new Error("Track is premium-only."));
					else resolve({ track, existing });
				}
			);
		});
	}

	/**
	 * Returns an array of songs taken from a SoundCloud playlist
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.url - the url of the SoundCloud playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						SoundCloudModule.runJob("API_RESOLVE", { url: payload.url }, this)
							.then(async ({ response }) => {
								const { data } = response;
								if (!data || !data.id)
									return next("The provided URL does not exist or cannot be accessed.");

								let tracks;

								if (data.kind === "user")
									tracks = (
										await SoundCloudModule.runJob(
											"GET_ARTIST_TRACKS",
											{
												artistId: data.id
											},
											this
										)
									).tracks;
								else if (data.kind !== "playlist" && data.kind !== "system-playlist")
									return next(`Invalid URL provided. Kind got: ${data.kind}.`);
								else tracks = data.tracks;

								const soundcloudTrackIds = tracks.map(track => track.id);

								return next(null, soundcloudTrackIds);
							})
							.catch(next);
					}
				],
				(err, soundcloudTrackIds) => {
					if (err && err !== true) {
						SoundCloudModule.log(
							"ERROR",
							"GET_PLAYLIST",
							"Some error has occurred.",
							typeof err === "string" ? err : err.message
						);
						reject(new Error(typeof err === "string" ? err : err.message));
					} else {
						resolve({ songs: soundcloudTrackIds });
					}
				}
			);

			// kind;
		});
	}

	/**
	 * Returns an array of songs taken from a SoundCloud artist
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.artistId - the id of the SoundCloud artist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_ARTIST_TRACKS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						let first = true;
						let nextHref = null;

						let tracks = [];

						async.whilst(
							next => {
								if (nextHref || first) next(null, true);
								else next(null, false);
							},
							next => {
								let job;

								if (first) {
									job = SoundCloudModule.runJob(
										"API_GET_ARTIST_TRACKS",
										{ artistId: payload.artistId },
										this
									);
									first = false;
								} else job = SoundCloudModule.runJob("API_GET_ARTIST_TRACKS", { nextHref }, this);

								job.then(({ response }) => {
									const { data } = response;
									const { collection, next_href: _nextHref } = data;

									nextHref = _nextHref;
									tracks = tracks.concat(collection);

									setTimeout(() => {
										next();
									}, 500);
								}).catch(err => {
									next(err);
								});
							},
							err => {
								if (err) return next(err);

								return next(null, tracks);
							}
						);
					}
				],
				(err, tracks) => {
					if (err && err !== true) {
						SoundCloudModule.log(
							"ERROR",
							"GET_ARTIST_TRACKS",
							"Some error has occurred.",
							typeof err === "string" ? err : err.message
						);
						reject(new Error(typeof err === "string" ? err : err.message));
					} else {
						resolve({ tracks });
					}
				}
			);
		});
	}

	/**
	 * Get Soundcloud artists
	 * @param {object} payload - an object containing the payload
	 * @param {Array} payload.userPermalinks - an array of Soundcloud user permalinks
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_ARTISTS_FROM_PERMALINKS(payload) {
		const getArtists = async userPermalinks => {
			const jobsToRun = [];

			userPermalinks.forEach(userPermalink => {
				const url = `https://soundcloud.com/${userPermalink}`;

				jobsToRun.push(SoundCloudModule.runJob("API_RESOLVE", { url }, this));
			});

			const jobResponses = await Promise.all(jobsToRun);

			return jobResponses
				.map(jobResponse => jobResponse.response.data)
				.map(artist => ({
					artistId: artist.id,
					username: artist.username,
					avatarUrl: artist.avatar_url,
					permalink: artist.permalink,
					rawData: artist
				}));
		};

		const { userPermalinks } = payload;
		const existingArtists = [];

		const existingUserPermalinks = existingArtists.map(existingArtists => existingArtists.userPermalink);
		// const existingArtistsObjectIds = existingArtists.map(existingArtists => existingArtists._id.toString());

		if (userPermalinks.length === existingArtists.length) return { artists: existingArtists };

		const missingUserPermalinks = userPermalinks.filter(
			userPermalink => existingUserPermalinks.indexOf(userPermalink) === -1
		);

		if (missingUserPermalinks.length === 0) return { videos: existingArtists };

		const newArtists = await getArtists(missingUserPermalinks);

		// await SoundcloudModule.soundcloudArtistsModel.insertMany(newArtists);

		return { artists: existingArtists.concat(newArtists) };
	}

	/**
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.url - the url of the SoundCloud resource
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	API_RESOLVE(payload) {
		return new Promise((resolve, reject) => {
			const { url } = payload;

			SoundCloudModule.runJob(
				"API_CALL",
				{
					url: `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}`
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
	 * Calls the API_CALL with the proper URL to get artist/user tracks
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.artistId - the id of the SoundCloud artist
	 * @param {string} payload.nextHref - the next url to call
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	API_GET_ARTIST_TRACKS(payload) {
		return new Promise((resolve, reject) => {
			const { artistId, nextHref } = payload;

			SoundCloudModule.runJob(
				"API_CALL",
				{
					url: artistId
						? `https://api-v2.soundcloud.com/users/${artistId}/tracks?access=playable&limit=50`
						: nextHref
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
}

export default new _SoundCloudModule();
