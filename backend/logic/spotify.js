import mongoose from "mongoose";
import async from "async";
import config from "config";

import * as rax from "retry-axios";
import axios from "axios";
import url from "url";

import CoreClass from "../core";

let SpotifyModule;
let DBModule;
let CacheModule;
let MediaModule;

const spotifyTrackObjectToMusareTrackObject = spotifyTrackObject => {
	return {
		trackId: spotifyTrackObject.id,
		name: spotifyTrackObject.name,
		albumId: spotifyTrackObject.album.id,
		albumTitle: spotifyTrackObject.album.title,
		albumImageUrl: spotifyTrackObject.album.images[0].url,
		artists: spotifyTrackObject.artists.map(artist => artist.name),
		artistIds: spotifyTrackObject.artists.map(artist => artist.id),
		duration: spotifyTrackObject.duration_ms / 1000,
		explicit: spotifyTrackObject.explicit,
		externalIds: spotifyTrackObject.external_ids,
		popularity: spotifyTrackObject.popularity
	};
};

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

class _SpotifyModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("spotify");

		SpotifyModule = this;
	}

	/**
	 * Initialises the spotify module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		DBModule = this.moduleManager.modules.db;
		CacheModule = this.moduleManager.modules.cache;
		MediaModule = this.moduleManager.modules.media;

		// this.youtubeApiRequestModel = this.YoutubeApiRequestModel = await DBModule.runJob("GET_MODEL", {
		// 	modelName: "youtubeApiRequest"
		// });

		this.spotifyTrackModel = this.SpotifyTrackModel = await DBModule.runJob("GET_MODEL", {
			modelName: "spotifyTrack"
		});

		return new Promise((resolve, reject) => {
			this.rateLimiter = new RateLimitter(config.get("apis.spotify.rateLimit"));
			this.requestTimeout = config.get("apis.spotify.requestTimeout");

			this.axios = axios.create();
			this.axios.defaults.raxConfig = {
				instance: this.axios,
				retry: config.get("apis.spotify.retryAmount"),
				noResponseRetries: config.get("apis.spotify.retryAmount")
			};
			rax.attach(this.axios);

			resolve();
		});
	}

	/**
	 *
	 * @returns
	 */
	GET_API_TOKEN() {
		return new Promise((resolve, reject) => {
			CacheModule.runJob("GET", { key: "spotifyApiKey" }, this).then(spotifyApiKey => {
				if (spotifyApiKey) {
					resolve(spotifyApiKey);
					return;
				}

				this.log("INFO", `No Spotify API token stored in cache, requesting new token.`);

				const clientId = config.get("apis.spotify.clientId");
				const clientSecret = config.get("apis.spotify.clientSecret");
				const unencoded = `${clientId}:${clientSecret}`;
				const encoded = Buffer.from(unencoded).toString("base64");

				const params = new url.URLSearchParams({ grant_type: "client_credentials" });

				SpotifyModule.axios
					.post("https://accounts.spotify.com/api/token", params.toString(), {
						headers: {
							Authorization: `Basic ${encoded}`,
							"Content-Type": "application/x-www-form-urlencoded"
						}
					})
					.then(res => {
						const { access_token: accessToken, expires_in: expiresIn } = res.data;

						// TODO TTL can be later if stuck in queue
						CacheModule.runJob(
							"SET",
							{ key: "spotifyApiKey", value: accessToken, ttl: expiresIn - 30 },
							this
						)
							.then(spotifyApiKey => {
								this.log(
									"SUCCESS",
									`Stored new Spotify API token in cache. Expires in ${expiresIn - 30}`
								);
								resolve(spotifyApiKey);
							})
							.catch(err => {
								this.log(
									"ERROR",
									`Failed to store new Spotify API token in cache.`,
									typeof err === "string" ? err : err.message
								);
								reject(err);
							});
					})
					.catch(err => {
						this.log(
							"ERROR",
							`Failed to get new Spotify API token.`,
							typeof err === "string" ? err : err.message
						);
						reject(err);
					});
			});
		});
	}

	/**
	 * Perform Spotify API get track request
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_GET_TRACK(payload) {
		return new Promise((resolve, reject) => {
			const { trackId } = payload;

			SpotifyModule.runJob(
				"API_CALL",
				{
					url: `https://api.spotify.com/v1/tracks/${trackId}`
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
	 * Perform Spotify API get playlist request
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_GET_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const { playlistId, nextUrl } = payload;

			SpotifyModule.runJob(
				"API_CALL",
				{
					url: nextUrl || `https://api.spotify.com/v1/playlists/${playlistId}/tracks`
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
	 * Perform Spotify API call
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

			SpotifyModule.runJob("GET_API_TOKEN", {}, this)
				.then(spotifyApiToken => {
					SpotifyModule.axios
						.get(url, {
							headers: {
								Authorization: `Bearer ${spotifyApiToken}`
							},
							timeout: SpotifyModule.requestTimeout
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
				})
				.catch(err => {
					this.log(
						"ERROR",
						`Spotify API call failed as an error occured whilst getting the API token`,
						typeof err === "string" ? err : err.message
					);
					resolve(err);
				});
		});
	}

	/**
	 * Create Spotify track
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.spotifyTracks - the spotifyTracks
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CREATE_TRACKS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const { spotifyTracks } = payload;
						if (!Array.isArray(spotifyTracks)) next("Invalid spotifyTracks type");
						else {
							const trackIds = spotifyTracks.map(spotifyTrack => spotifyTrack.trackId);

							SpotifyModule.spotifyTrackModel.find({ trackId: trackIds }, (err, existingTracks) => {
								if (err) return next(err);

								const existingTrackIds = existingTracks.map(existingTrack => existingTrack.trackId);

								const newSpotifyTracks = spotifyTracks.filter(
									spotifyTrack => existingTrackIds.indexOf(spotifyTrack.trackId) === -1
								);

								SpotifyModule.spotifyTrackModel.insertMany(newSpotifyTracks, next);
							});
						}
					},

					(spotifyTracks, next) => {
						const mediaSources = spotifyTracks.map(spotifyTrack => `spotify:${spotifyTrack.trackId}`);
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
								else next(null, spotifyTracks);
							}
						);
					}
				],
				(err, spotifyTracks) => {
					if (err) reject(new Error(err));
					else resolve({ spotifyTracks });
				}
			);
		});
	}

	/**
	 * Get Spotify track
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.identifier - the spotify track ObjectId or track id
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

						return SpotifyModule.spotifyTrackModel.findOne(query, next);
					},

					(track, next) => {
						if (track) return next(null, track, false);
						if (mongoose.isObjectIdOrHexString(payload.identifier) || !payload.createMissing)
							return next("Spotify track not found.");
						return SpotifyModule.runJob("API_GET_TRACK", { trackId: payload.identifier }, this)
							.then(({ response }) => {
								const { data } = response;

								if (!data || !data.id)
									return next("The specified track does not exist or cannot be publicly accessed.");

								const spotifyTrack = spotifyTrackObjectToMusareTrackObject(data);

								return next(null, false, spotifyTrack);
							})
							.catch(next);
					},
					(track, spotifyTrack, next) => {
						if (track) return next(null, track, true);
						return SpotifyModule.runJob("CREATE_TRACKS", { spotifyTracks: [spotifyTrack] }, this)
							.then(res => {
								if (res.spotifyTracks.length === 1) next(null, res.spotifyTracks[0], false);
								else next("Spotify track not found.");
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

	/**
	 * Returns an array of songs taken from a Spotify playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.url - the id of the Spotify playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const spotifyPlaylistUrlRegex = /.+open\.spotify\.com\/playlist\/(?<playlistId>[A-Za-z0-9]+)/;
			const match = spotifyPlaylistUrlRegex.exec(payload.url);

			if (!match || !match.groups) {
				SpotifyModule.log("ERROR", "GET_PLAYLIST", "Invalid Spotify playlist URL query.");
				reject(new Error("Invalid playlist URL."));
				return;
			}

			const { playlistId } = match.groups;

			async.waterfall(
				[
					next => {
						let spotifyTracks = [];
						let total = -1;
						let nextUrl = "";

						async.whilst(
							next => {
								SpotifyModule.log(
									"INFO",
									`Getting playlist progress for job (${this.toString()}): ${
										spotifyTracks.length
									} tracks gotten so far. Total tracks: ${total}.`
								);
								next(null, nextUrl !== null);
							},
							next => {
								// Add 250ms delay between each job request
								setTimeout(() => {
									SpotifyModule.runJob("API_GET_PLAYLIST", { playlistId, nextUrl }, this)
										.then(({ response }) => {
											const { data } = response;

											if (!data)
												return next("The provided URL does not exist or cannot be accessed.");

											total = data.total;
											nextUrl = data.next;

											const { items } = data;
											const trackObjects = items.map(item => item.track);
											const newSpotifyTracks = trackObjects.map(trackObject =>
												spotifyTrackObjectToMusareTrackObject(trackObject)
											);

											spotifyTracks = spotifyTracks.concat(newSpotifyTracks);
											next();
										})
										.catch(err => next(err));
								}, 1000);
							},
							err => {
								if (err) next(err);
								else {
									return SpotifyModule.runJob("CREATE_TRACKS", { spotifyTracks }, this)
										.then(() => {
											next(
												null,
												spotifyTracks.map(spotifyTrack => spotifyTrack.trackId)
											);
										})
										.catch(next);
								}
							}
						);
					}
				],
				(err, soundcloudTrackIds) => {
					if (err && err !== true) {
						SpotifyModule.log(
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

	// /**
	//  * @param {object} payload - object that contains the payload
	//  * @param {string} payload.url - the url of the SoundCloud resource
	//  */
	// API_RESOLVE(payload) {
	// 	return new Promise((resolve, reject) => {
	// 		const { url } = payload;

	// 		SoundCloudModule.runJob(
	// 			"API_CALL",
	// 			{
	// 				url: `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(url)}`
	// 			},
	// 			this
	// 		)
	// 			.then(response => {
	// 				resolve(response);
	// 			})
	// 			.catch(err => {
	// 				reject(err);
	// 			});
	// 	});
	// }
}

export default new _SpotifyModule();
