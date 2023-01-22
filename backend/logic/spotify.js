import mongoose from "mongoose";
import async from "async";
import config from "config";

import * as rax from "retry-axios";
import axios from "axios";
import url from "url";

import CoreClass from "../core";

let SpotifyModule;
let SoundcloudModule;
let DBModule;
let CacheModule;
let MediaModule;
let MusicBrainzModule;
let WikiDataModule;

const youtubeVideoUrlRegex =
	/^(https?:\/\/)?(www\.)?(m\.)?(music\.)?(youtube\.com|youtu\.be)\/(watch\?v=)?(?<youtubeId>[\w-]{11})((&([A-Za-z0-9]+)?)*)?$/;
const youtubeVideoIdRegex = /^([\w-]{11})$/;

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
		popularity: spotifyTrackObject.popularity,
		isLocal: spotifyTrackObject.is_local
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
		MusicBrainzModule = this.moduleManager.modules.musicbrainz;
		SoundcloudModule = this.moduleManager.modules.soundcloud;
		WikiDataModule = this.moduleManager.modules.wikidata;

		// this.youtubeApiRequestModel = this.YoutubeApiRequestModel = await DBModule.runJob("GET_MODEL", {
		// 	modelName: "youtubeApiRequest"
		// });

		this.spotifyTrackModel = this.SpotifyTrackModel = await DBModule.runJob("GET_MODEL", {
			modelName: "spotifyTrack"
		});
		this.spotifyAlbumModel = this.SpotifyAlbumModel = await DBModule.runJob("GET_MODEL", {
			modelName: "spotifyAlbum"
		});

		return new Promise((resolve, reject) => {
			if (!config.has("apis.spotify") || !config.get("apis.spotify.enabled")) {
				reject(new Error("Spotify is not enabled."));
				return;
			}

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
	 * Perform Spotify API get albums request
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.albumIds - the album ids to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_GET_ALBUMS(payload) {
		return new Promise((resolve, reject) => {
			const { albumIds } = payload;

			SpotifyModule.runJob(
				"API_CALL",
				{
					url: `https://api.spotify.com/v1/albums`,
					params: {
						ids: albumIds.join(",")
					}
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
			const { url, params } = payload;

			SpotifyModule.runJob("GET_API_TOKEN", {}, this)
				.then(spotifyApiToken => {
					SpotifyModule.axios
						.get(url, {
							headers: {
								Authorization: `Bearer ${spotifyApiToken}`
							},
							timeout: SpotifyModule.requestTimeout,
							params
						})
						.then(response => {
							if (response.data.error) {
								reject(new Error(response.data.error));
							} else {
								resolve({ response });
							}
						})
						.catch(err => {
							console.log(4443311, err);
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
	 * Create Spotify albums
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.spotifyAlbums - the Spotify albums
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async CREATE_ALBUMS(payload) {
		const { spotifyAlbums } = payload;

		if (!Array.isArray(spotifyAlbums)) throw new Error("Invalid spotifyAlbums type");

		const albumIds = spotifyAlbums.map(spotifyAlbum => spotifyAlbum.albumId);

		const existingAlbums = (await SpotifyModule.spotifyAlbumModel.find({ albumId: albumIds })).map(
			album => album._doc
		);
		const existingAlbumIds = existingAlbums.map(existingAlbum => existingAlbum.albumId);

		const newSpotifyAlbums = spotifyAlbums.filter(
			spotifyAlbum => existingAlbumIds.indexOf(spotifyAlbum.albumId) === -1
		);

		if (newSpotifyAlbums.length === 0) return existingAlbums;

		await SpotifyModule.spotifyAlbumModel.insertMany(newSpotifyAlbums);

		return existingAlbums.concat(newSpotifyAlbums);
	}

	/**
	 * Gets tracks from media sources
	 *
	 * @param {object} payload
	 * @returns {Promise}
	 */
	async GET_TRACKS_FROM_MEDIA_SOURCES(payload) {
		return new Promise((resolve, reject) => {
			const { mediaSources } = payload;

			const responses = {};

			const promises = [];

			mediaSources.forEach(mediaSource => {
				promises.push(
					new Promise(resolve => {
						const trackId = mediaSource.split(":")[1];
						SpotifyModule.runJob("GET_TRACK", { identifier: trackId, createMissing: true }, this)
							.then(({ track }) => {
								responses[mediaSource] = track;
							})
							.catch(err => {
								SpotifyModule.log(
									"ERROR",
									`Getting tracked with media source ${mediaSource} failed.`,
									typeof err === "string" ? err : err.message
								);
								responses[mediaSource] = typeof err === "string" ? err : err.message;
							})
							.finally(() => {
								resolve();
							});
					})
				);
			});

			Promise.all(promises)
				.then(() => {
					SpotifyModule.log("SUCCESS", `Got all tracks.`);
					resolve({ tracks: responses });
				})
				.catch(reject);
		});
	}

	/**
	 * Gets albums from ids
	 *
	 * @param {object} payload
	 * @returns {Promise}
	 */
	async GET_ALBUMS_FROM_IDS(payload) {
		const { albumIds } = payload;

		console.log(albumIds);

		const existingAlbums = (await SpotifyModule.spotifyAlbumModel.find({ albumId: albumIds })).map(
			album => album._doc
		);
		const existingAlbumIds = existingAlbums.map(existingAlbum => existingAlbum.albumId);

		console.log(existingAlbums);

		const missingAlbumIds = albumIds.filter(albumId => existingAlbumIds.indexOf(albumId) === -1);

		if (missingAlbumIds.length === 0) return existingAlbums;

		console.log(missingAlbumIds);

		const jobsToRun = [];

		const chunkSize = 2;
		while (missingAlbumIds.length > 0) {
			const chunkedMissingAlbumIds = missingAlbumIds.splice(0, chunkSize);

			jobsToRun.push(SpotifyModule.runJob("API_GET_ALBUMS", { albumIds: chunkedMissingAlbumIds }, this));
		}

		const jobResponses = await Promise.all(jobsToRun);

		console.log(jobResponses);

		const newAlbums = jobResponses
			.map(jobResponse => jobResponse.response.data.albums)
			.flat()
			.map(album => ({
				albumId: album.id,
				rawData: album
			}));

		console.log(newAlbums);

		await SpotifyModule.runJob("CREATE_ALBUMS", { spotifyAlbums: newAlbums }, this);

		return existingAlbums.concat(newAlbums);
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
					else if (track.isLocal) reject(new Error("Track is local."));
					else resolve({ track, existing });
				}
			);
		});
	}

	/**
	 * Get Spotify album
	 *
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.identifier - the spotify album ObjectId or track id
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_ALBUM(payload) {
		const query = mongoose.isObjectIdOrHexString(payload.identifier)
			? { _id: payload.identifier }
			: { albumId: payload.identifier };

		const album = await SpotifyModule.spotifyAlbumModel.findOne(query);

		if (album) return album._doc;

		return null;
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

	/**
	 *
	 * @param {*} payload
	 * @returns
	 */
	async GET_ALTERNATIVE_ALBUM_SOURCES_FOR_ALBUMS(payload) {
		const { albumIds, collectAlternativeAlbumSourcesOrigins } = payload;

		await async.eachLimit(albumIds, 1, async albumId => {
			try {
				const result = await SpotifyModule.runJob(
					"GET_ALTERNATIVE_ALBUM_SOURCES_FOR_ALBUM",
					{ albumId, collectAlternativeAlbumSourcesOrigins },
					this
				);
				this.publishProgress({
					status: "working",
					message: `Got alternative album source for ${albumId}`,
					data: {
						albumId,
						status: "success",
						result
					}
				});
			} catch (err) {
				console.log("ERROR", err);
				this.publishProgress({
					status: "working",
					message: `Failed to get alternative album source for ${albumId}`,
					data: {
						albumId,
						status: "error"
					}
				});
			}
		});

		console.log("Done!");

		this.publishProgress({
			status: "finished",
			message: `Finished getting alternative album sources`
		});
	}

	/**
	 *
	 * @param {*} payload
	 * @returns
	 */
	async GET_ALTERNATIVE_ALBUM_SOURCES_FOR_ALBUM(payload) {
		const { albumId, collectAlternativeAlbumSourcesOrigins } = payload;

		if (!albumId) throw new Error("Album id provided is not valid.");

		// const album = await SpotifyModule.runJob(
		// 	"GET_ALBUM",
		// 	{
		// 		identifier: albumId
		// 	},
		// 	this
		// );

		const wikiDataResponse = await WikiDataModule.runJob(
			"API_GET_DATA_FROM_SPOTIFY_ALBUM",
			{ spotifyAlbumId: albumId },
			this
		);

		const youtubePlaylistIds = Array.from(
			new Set(
				wikiDataResponse.results.bindings
					.filter(binding => !!binding.YouTube_playlist_ID)
					.map(binding => binding.YouTube_playlist_ID.value)
			)
		);

		return youtubePlaylistIds;
	}

	/**
	 *
	 * @param {*} payload
	 * @returns
	 */
	async GET_ALTERNATIVE_MEDIA_SOURCES_FOR_TRACKS(payload) {
		const { mediaSources, collectAlternativeMediaSourcesOrigins } = payload;

		// console.log("KR*S94955", mediaSources);

		// this.pub

		await async.eachLimit(mediaSources, 1, async mediaSource => {
			try {
				const result = await SpotifyModule.runJob(
					"GET_ALTERNATIVE_MEDIA_SOURCES_FOR_TRACK",
					{ mediaSource, collectAlternativeMediaSourcesOrigins },
					this
				);
				this.publishProgress({
					status: "working",
					message: `Got alternative media for ${mediaSource}`,
					data: {
						mediaSource,
						status: "success",
						result
					}
				});
			} catch (err) {
				console.log("ERROR", err);
				this.publishProgress({
					status: "working",
					message: `Failed to get alternative media for ${mediaSource}`,
					data: {
						mediaSource,
						status: "error"
					}
				});
			}
		});

		console.log("Done!");

		this.publishProgress({
			status: "finished",
			message: `Finished getting alternative media`
		});
	}

	/**
	 *
	 * @param {*} payload
	 * @returns
	 */
	async GET_ALTERNATIVE_MEDIA_SOURCES_FOR_TRACK(payload) {
		const { mediaSource, collectAlternativeMediaSourcesOrigins } = payload;

		if (!mediaSource || !mediaSource.startsWith("spotify:"))
			throw new Error("Media source provided is not a valid Spotify media source.");

		const spotifyTrackId = mediaSource.split(":")[1];

		const { track: spotifyTrack } = await SpotifyModule.runJob(
			"GET_TRACK",
			{
				identifier: spotifyTrackId,
				createMissing: true
			},
			this
		);

		const ISRC = spotifyTrack.externalIds.isrc;
		if (!ISRC) throw new Error(`ISRC not found for Spotify track ${mediaSource}.`);

		const mediaSources = new Set();
		const mediaSourcesOrigins = {};

		const jobsToRun = [];

		try {
			const ISRCApiResponse = await MusicBrainzModule.runJob(
				"API_CALL",
				{
					url: `https://musicbrainz.org/ws/2/isrc/${ISRC}`,
					params: {
						fmt: "json",
						inc: "url-rels+work-rels"
					}
				},
				this
			);

			// console.log("ISRCApiResponse");
			// console.dir(ISRCApiResponse, { depth: 5 });

			ISRCApiResponse.recordings.forEach(recording => {
				recording.relations.forEach(relation => {
					if (relation["target-type"] === "url" && relation.url) {
						// relation["type-id"] === "7e41ef12-a124-4324-afdb-fdbae687a89c"
						const { resource } = relation.url;

						if (resource.indexOf("soundcloud.com") !== -1) {
							// throw new Error(`Unable to parse SoundCloud resource ${resource}.`);

							const promise = new Promise(resolve => {
								SoundcloudModule.runJob(
									"GET_TRACK_FROM_URL",
									{ identifier: resource, createMissing: true },
									this
								)
									.then(response => {
										const { trackId } = response.track;
										const mediaSource = `soundcloud:${trackId}`;

										mediaSources.add(mediaSource);

										if (collectAlternativeMediaSourcesOrigins) {
											const mediaSourceOrigins = [
												`Spotify track ${spotifyTrackId}`,
												`ISRC ${ISRC}`,
												`MusicBrainz recordings`,
												`MusicBrainz recording ${recording.id}`,
												`MusicBrainz relations`,
												`MusicBrainz relation target-type url`,
												`MusicBrainz relation resource ${resource}`,
												`SoundCloud ID ${trackId}`
											];

											if (!mediaSourcesOrigins[mediaSource])
												mediaSourcesOrigins[mediaSource] = [];

											mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
										}

										resolve();
									})
									.catch(() => {
										resolve();
									});
							});

							jobsToRun.push(promise);

							return;
						}

						if (resource.indexOf("youtube.com") !== -1 || resource.indexOf("youtu.be") !== -1) {
							const match = youtubeVideoUrlRegex.exec(resource);
							if (!match) throw new Error(`Unable to parse YouTube resource ${resource}.`);

							const { youtubeId } = match.groups;
							if (!youtubeId) throw new Error(`Unable to parse YouTube resource ${resource}.`);

							const mediaSource = `youtube:${youtubeId}`;

							mediaSources.add(mediaSource);

							if (collectAlternativeMediaSourcesOrigins) {
								const mediaSourceOrigins = [
									`Spotify track ${spotifyTrackId}`,
									`ISRC ${ISRC}`,
									`MusicBrainz recordings`,
									`MusicBrainz recording ${recording.id}`,
									`MusicBrainz relations`,
									`MusicBrainz relation target-type url`,
									`MusicBrainz relation resource ${resource}`,
									`YouTube ID ${youtubeId}`
								];

								if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

								mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
							}

							return;
						}

						return;
					}

					if (relation["target-type"] === "work") {
						const promise = new Promise(resolve => {
							WikiDataModule.runJob(
								"API_GET_DATA_FROM_MUSICBRAINZ_WORK",
								{ workId: relation.work.id },
								this
							)
								.then(resultBody => {
									const youtubeIds = Array.from(
										new Set(
											resultBody.results.bindings
												.filter(binding => !!binding.YouTube_video_ID)
												.map(binding => binding.YouTube_video_ID.value)
										)
									);
									// const soundcloudIds = Array.from(
									// 	new Set(
									// 		resultBody.results.bindings
									// 			.filter(binding => !!binding["SoundCloud_track_ID"])
									// 			.map(binding => binding["SoundCloud_track_ID"].value)
									// 	)
									// );
									const musicVideoEntityUrls = Array.from(
										new Set(
											resultBody.results.bindings
												.filter(binding => !!binding.Music_video_entity_URL)
												.map(binding => binding.Music_video_entity_URL.value)
										)
									);

									youtubeIds.forEach(youtubeId => {
										const mediaSource = `youtube:${youtubeId}`;

										mediaSources.add(mediaSource);

										if (collectAlternativeMediaSourcesOrigins) {
											const mediaSourceOrigins = [
												`Spotify track ${spotifyTrackId}`,
												`ISRC ${ISRC}`,
												`MusicBrainz recordings`,
												`MusicBrainz recording ${recording.id}`,
												`MusicBrainz relations`,
												`MusicBrainz relation target-type work`,
												`MusicBrainz relation work id ${relation.work.id}`,
												`WikiData select from MusicBrainz work id ${relation.work.id}`,
												`YouTube ID ${youtubeId}`
											];

											if (!mediaSourcesOrigins[mediaSource])
												mediaSourcesOrigins[mediaSource] = [];

											mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
										}
									});

									// soundcloudIds.forEach(soundcloudId => {
									// 	const mediaSource = `soundcloud:${soundcloudId}`;

									// 	mediaSources.add(mediaSource);

									// 	if (collectAlternativeMediaSourcesOrigins) {
									// 		const mediaSourceOrigins = [
									// 			`Spotify track ${spotifyTrackId}`,
									// 			`ISRC ${ISRC}`,
									// 			`MusicBrainz recordings`,
									// 			`MusicBrainz recording ${recording.id}`,
									// 			`MusicBrainz relations`,
									// 			`MusicBrainz relation target-type work`,
									// 			`MusicBrainz relation work id ${relation.work.id}`,
									// 			`WikiData select from MusicBrainz work id ${relation.work.id}`,
									// 			`SoundCloud ID ${soundcloudId}`
									// 		];

									// 		if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

									// 		mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
									// 	}
									// });

									const promisesToRun2 = [];

									musicVideoEntityUrls.forEach(musicVideoEntityUrl => {
										promisesToRun2.push(
											new Promise(resolve => {
												WikiDataModule.runJob(
													"API_GET_DATA_FROM_ENTITY_URL",
													{ entityUrl: musicVideoEntityUrl },
													this
												).then(resultBody => {
													const youtubeIds = Array.from(
														new Set(
															resultBody.results.bindings
																.filter(binding => !!binding.YouTube_video_ID)
																.map(binding => binding.YouTube_video_ID.value)
														)
													);
													// const soundcloudIds = Array.from(
													// 	new Set(
													// 		resultBody.results.bindings
													// 			.filter(binding => !!binding["SoundCloud_track_ID"])
													// 			.map(binding => binding["SoundCloud_track_ID"].value)
													// 	)
													// );

													youtubeIds.forEach(youtubeId => {
														const mediaSource = `youtube:${youtubeId}`;

														mediaSources.add(mediaSource);

														// if (collectAlternativeMediaSourcesOrigins) {
														// 	const mediaSourceOrigins = [
														// 		`Spotify track ${spotifyTrackId}`,
														// 		`ISRC ${ISRC}`,
														// 		`MusicBrainz recordings`,
														// 		`MusicBrainz recording ${recording.id}`,
														// 		`MusicBrainz relations`,
														// 		`MusicBrainz relation target-type work`,
														// 		`MusicBrainz relation work id ${relation.work.id}`,
														// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
														// 		`YouTube ID ${youtubeId}`
														// 	];

														// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

														// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
														// }
													});

													// soundcloudIds.forEach(soundcloudId => {
													// 	const mediaSource = `soundcloud:${soundcloudId}`;

													// 	mediaSources.add(mediaSource);

													// 	// if (collectAlternativeMediaSourcesOrigins) {
													// 	// 	const mediaSourceOrigins = [
													// 	// 		`Spotify track ${spotifyTrackId}`,
													// 	// 		`ISRC ${ISRC}`,
													// 	// 		`MusicBrainz recordings`,
													// 	// 		`MusicBrainz recording ${recording.id}`,
													// 	// 		`MusicBrainz relations`,
													// 	// 		`MusicBrainz relation target-type work`,
													// 	// 		`MusicBrainz relation work id ${relation.work.id}`,
													// 	// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
													// 	// 		`SoundCloud ID ${soundcloudId}`
													// 	// 	];

													// 	// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

													// 	// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
													// 	// }
													// });

													resolve();
												});
											})
										);
									});

									Promise.allSettled(promisesToRun2).then(resolve);
								})
								.catch(err => {
									console.log("KRISWORKERR", err);
									resolve();
								});
						});

						jobsToRun.push(promise);

						//WikiDataModule.runJob("API_GET_DATA_FROM_MUSICBRAINZ_WORK", { workId: relation.work.id }, this));

						return;
					}
				});
			});
		} catch (err) {
			console.log("Error during initial ISRC getting/parsing", err);
		}

		try {
			const RecordingApiResponse = await MusicBrainzModule.runJob(
				"API_CALL",
				{
					url: `https://musicbrainz.org/ws/2/recording/`,
					params: {
						fmt: "json",
						query: `isrc:${ISRC}`
					}
				},
				this
			);

			const releaseIds = new Set();
			const releaseGroupIds = new Set();

			RecordingApiResponse.recordings.forEach(recording => {
				const recordingId = recording.id;
				// console.log("Recording:", recording.id);

				recording.releases.forEach(release => {
					const releaseId = release.id;
					// console.log("Release:", releaseId);

					const releaseGroupId = release["release-group"].id;
					// console.log("Release group:", release["release-group"]);
					// console.log("Release group id:", release["release-group"].id);
					// console.log("Release group type id:", release["release-group"]["type-id"]);
					// console.log("Release group primary type id:", release["release-group"]["primary-type-id"]);
					// console.log("Release group primary type:", release["release-group"]["primary-type"]);

					// d6038452-8ee0-3f68-affc-2de9a1ede0b9 = single
					// 6d0c5bf6-7a33-3420-a519-44fc63eedebf = EP
					if (
						release["release-group"]["type-id"] === "d6038452-8ee0-3f68-affc-2de9a1ede0b9" ||
						release["release-group"]["type-id"] === "6d0c5bf6-7a33-3420-a519-44fc63eedebf"
					) {
						releaseIds.add(releaseId);
						releaseGroupIds.add(releaseGroupId);
					}
				});
			});

			Array.from(releaseGroupIds).forEach(releaseGroupId => {
				const promise = new Promise(resolve => {
					WikiDataModule.runJob("API_GET_DATA_FROM_MUSICBRAINZ_RELEASE_GROUP", { releaseGroupId }, this)
						.then(resultBody => {
							const youtubeIds = Array.from(
								new Set(
									resultBody.results.bindings
										.filter(binding => !!binding.YouTube_video_ID)
										.map(binding => binding.YouTube_video_ID.value)
								)
							);
							// const soundcloudIds = Array.from(
							// 	new Set(
							// 		resultBody.results.bindings
							// 			.filter(binding => !!binding["SoundCloud_track_ID"])
							// 			.map(binding => binding["SoundCloud_track_ID"].value)
							// 	)
							// );
							const musicVideoEntityUrls = Array.from(
								new Set(
									resultBody.results.bindings
										.filter(binding => !!binding.Music_video_entity_URL)
										.map(binding => binding.Music_video_entity_URL.value)
								)
							);

							youtubeIds.forEach(youtubeId => {
								const mediaSource = `youtube:${youtubeId}`;

								mediaSources.add(mediaSource);

								// if (collectAlternativeMediaSourcesOrigins) {
								// 	const mediaSourceOrigins = [
								// 		`Spotify track ${spotifyTrackId}`,
								// 		`ISRC ${ISRC}`,
								// 		`MusicBrainz recordings`,
								// 		`MusicBrainz recording ${recording.id}`,
								// 		`MusicBrainz relations`,
								// 		`MusicBrainz relation target-type work`,
								// 		`MusicBrainz relation work id ${relation.work.id}`,
								// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
								// 		`YouTube ID ${youtubeId}`
								// 	];

								// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

								// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
								// }
							});

							// soundcloudIds.forEach(soundcloudId => {
							// 	const mediaSource = `soundcloud:${soundcloudId}`;

							// 	mediaSources.add(mediaSource);

							// 	// if (collectAlternativeMediaSourcesOrigins) {
							// 	// 	const mediaSourceOrigins = [
							// 	// 		`Spotify track ${spotifyTrackId}`,
							// 	// 		`ISRC ${ISRC}`,
							// 	// 		`MusicBrainz recordings`,
							// 	// 		`MusicBrainz recording ${recording.id}`,
							// 	// 		`MusicBrainz relations`,
							// 	// 		`MusicBrainz relation target-type work`,
							// 	// 		`MusicBrainz relation work id ${relation.work.id}`,
							// 	// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
							// 	// 		`SoundCloud ID ${soundcloudId}`
							// 	// 	];

							// 	// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

							// 	// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
							// 	// }
							// });

							const promisesToRun2 = [];

							musicVideoEntityUrls.forEach(musicVideoEntityUrl => {
								promisesToRun2.push(
									new Promise(resolve => {
										WikiDataModule.runJob(
											"API_GET_DATA_FROM_ENTITY_URL",
											{ entityUrl: musicVideoEntityUrl },
											this
										).then(resultBody => {
											const youtubeIds = Array.from(
												new Set(
													resultBody.results.bindings
														.filter(binding => !!binding.YouTube_video_ID)
														.map(binding => binding.YouTube_video_ID.value)
												)
											);
											// const soundcloudIds = Array.from(
											// 	new Set(
											// 		resultBody.results.bindings
											// 			.filter(binding => !!binding["SoundCloud_track_ID"])
											// 			.map(binding => binding["SoundCloud_track_ID"].value)
											// 	)
											// );

											youtubeIds.forEach(youtubeId => {
												const mediaSource = `youtube:${youtubeId}`;

												mediaSources.add(mediaSource);

												// if (collectAlternativeMediaSourcesOrigins) {
												// 	const mediaSourceOrigins = [
												// 		`Spotify track ${spotifyTrackId}`,
												// 		`ISRC ${ISRC}`,
												// 		`MusicBrainz recordings`,
												// 		`MusicBrainz recording ${recording.id}`,
												// 		`MusicBrainz relations`,
												// 		`MusicBrainz relation target-type work`,
												// 		`MusicBrainz relation work id ${relation.work.id}`,
												// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
												// 		`YouTube ID ${youtubeId}`
												// 	];

												// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

												// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
												// }
											});

											// soundcloudIds.forEach(soundcloudId => {
											// 	const mediaSource = `soundcloud:${soundcloudId}`;

											// 	mediaSources.add(mediaSource);

											// 	// if (collectAlternativeMediaSourcesOrigins) {
											// 	// 	const mediaSourceOrigins = [
											// 	// 		`Spotify track ${spotifyTrackId}`,
											// 	// 		`ISRC ${ISRC}`,
											// 	// 		`MusicBrainz recordings`,
											// 	// 		`MusicBrainz recording ${recording.id}`,
											// 	// 		`MusicBrainz relations`,
											// 	// 		`MusicBrainz relation target-type work`,
											// 	// 		`MusicBrainz relation work id ${relation.work.id}`,
											// 	// 		`WikiData select from MusicBrainz work id ${relation.work.id}`,
											// 	// 		`SoundCloud ID ${soundcloudId}`
											// 	// 	];

											// 	// 	if (!mediaSourcesOrigins[mediaSource]) mediaSourcesOrigins[mediaSource] = [];

											// 	// 	mediaSourcesOrigins[mediaSource].push(mediaSourceOrigins);
											// 	// }
											// });

											resolve();
										});
									})
								);
							});

							Promise.allSettled(promisesToRun2).then(resolve);
						})
						.catch(err => {
							console.log("KRISWORKERR", err);
							resolve();
						});
				});

				jobsToRun.push(promise);
			});
		} catch (err) {
			console.log("Error during getting releases from ISRC", err);
		}

		// console.log("RecordingApiResponse");
		// console.dir(RecordingApiResponse, { depth: 10 });
		// console.dir(RecordingApiResponse.recordings[0].releases[0], { depth: 10 });

		await Promise.allSettled(jobsToRun);

		return {
			mediaSources: Array.from(mediaSources),
			mediaSourcesOrigins
		};
	}
}

export default new _SpotifyModule();
