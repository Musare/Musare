import axios from "axios";

import CoreClass from "../core";

class RateLimitter {
	/**
	 * Constructor
	 *
	 * @param {number} timeBetween - The time between each allowed WikiData request
	 */
	constructor(timeBetween) {
		this.dateStarted = Date.now();
		this.timeBetween = timeBetween;
	}

	/**
	 * Returns a promise that resolves whenever the ratelimit of a WikiData request is done
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

let WikiDataModule;
let DBModule;

class _WikiDataModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("wikidata", {
			concurrency: 10
			// priorities: {
			// 	GET_PLAYLIST: 11
			// }
		});

		WikiDataModule = this;
	}

	/**
	 * Initialises the activities module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		DBModule = this.moduleManager.modules.db;

		this.genericApiRequestModel = this.GenericApiRequestModel = await DBModule.runJob("GET_MODEL", {
			modelName: "genericApiRequest"
		});

		// this.youtubeVideoModel = this.YoutubeVideoModel = await DBModule.runJob("GET_MODEL", {
		// 	modelName: "youtubeVideo"
		// });

		// return new Promise(resolve => {
		// CacheModule.runJob("SUB", {
		// 	channel: "youtube.removeYoutubeApiRequest",
		// 	cb: requestId => {
		// 		WSModule.runJob("EMIT_TO_ROOM", {
		// 			room: `view-api-request.${requestId}`,
		// 			args: ["event:youtubeApiRequest.removed"]
		// 		});

		// 		WSModule.runJob("EMIT_TO_ROOM", {
		// 			room: "admin.youtube",
		// 			args: ["event:admin.youtubeApiRequest.removed", { data: { requestId } }]
		// 		});
		// 	}
		// });

		// CacheModule.runJob("SUB", {
		// 	channel: "youtube.removeVideos",
		// 	cb: videoIds => {
		// 		const videos = Array.isArray(videoIds) ? videoIds : [videoIds];
		// 		videos.forEach(videoId => {
		// 			WSModule.runJob("EMIT_TO_ROOM", {
		// 				room: `view-media.youtube:${videoId}`,
		// 				args: ["event:youtubeVideo.removed"]
		// 			});

		// 			WSModule.runJob("EMIT_TO_ROOM", {
		// 				room: "admin.youtubeVideos",
		// 				args: ["event:admin.youtubeVideo.removed", { data: { videoId } }]
		// 			});

		// 			WSModule.runJob("EMIT_TO_ROOMS", {
		// 				rooms: ["import-album", "edit-songs"],
		// 				args: ["event:admin.youtubeVideo.removed", { videoId }]
		// 			});
		// 		});
		// 	}
		// });

		this.rateLimiter = new RateLimitter(1100);
		// this.requestTimeout = config.get("apis.youtube.requestTimeout");
		this.requestTimeout = 5000;

		this.axios = axios.create();
		// this.axios.defaults.raxConfig = {
		// 	instance: this.axios,
		// 	retry: config.get("apis.youtube.retryAmount"),
		// 	noResponseRetries: config.get("apis.youtube.retryAmount")
		// };
		// rax.attach(this.axios);

		// this.youtubeApiRequestModel
		// 	.find(
		// 		{ date: { $gte: new Date() - 2 * 24 * 60 * 60 * 1000 } },
		// 		{ date: true, quotaCost: true, _id: false }
		// 	)
		// 	.sort({ date: 1 })
		// 	.exec((err, youtubeApiRequests) => {
		// 		if (err) console.log("Couldn't load YouTube API requests.");
		// 		else {
		// 			this.apiCalls = youtubeApiRequests;
		// 			resolve();
		// 		}
		// 	});

		// 	resolve();
		// });
	}

	/**
	 * Get WikiData data from entity url
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.entityUrl - entity url
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_GET_DATA_FROM_ENTITY_URL(payload) {
		const { entityUrl } = payload;

		const sparqlQuery = `PREFIX entity_url: <${entityUrl}>
							SELECT DISTINCT ?YouTube_video_ID ?SoundCloud_track_ID WHERE {
								OPTIONAL { entity_url: wdt:P1651 ?YouTube_video_ID. }
								OPTIONAL { entity_url: wdt:P3040 ?SoundCloud_track_ID. }
							}`
			.replaceAll("\n", "")
			.replaceAll("\t", "");

		return WikiDataModule.runJob(
			"API_CALL",
			{
				url: "https://query.wikidata.org/sparql",
				params: {
					query: sparqlQuery
				}
			},
			this
		);
	}

	/**
	 * Get WikiData data from work id
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.workId - work id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_GET_DATA_FROM_MUSICBRAINZ_WORK(payload) {
		const { workId } = payload;

		const sparqlQuery =
			`SELECT DISTINCT ?item ?itemLabel ?YouTube_video_ID ?SoundCloud_ID ?Music_video_entity_URL WHERE {
				SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
				{
					SELECT DISTINCT ?item WHERE {
						?item p:P435 ?statement0.
						?statement0 ps:P435 "${workId}".
					}
					LIMIT 100
				}
				OPTIONAL { ?item wdt:P1651 ?YouTube_video_ID. }
				OPTIONAL { ?item wdt:P3040 ?SoundCloud_ID. }
				OPTIONAL { ?item wdt:P6718 ?Music_video_entity_URL. }
			}`
				.replaceAll("\n", "")
				.replaceAll("\t", "");

		return WikiDataModule.runJob(
			"API_CALL",
			{
				url: "https://query.wikidata.org/sparql",
				params: {
					query: sparqlQuery
				}
			},
			this
		);
	}

	/**
	 * Get WikiData data from release group id
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.releaseGroupId - release group id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_GET_DATA_FROM_MUSICBRAINZ_RELEASE_GROUP(payload) {
		const { releaseGroupId } = payload;

		const sparqlQuery =
			`SELECT DISTINCT ?item ?itemLabel ?YouTube_video_ID ?SoundCloud_ID ?Music_video_entity_URL WHERE {
				SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
				{
					SELECT DISTINCT ?item WHERE {
						?item p:P436 ?statement0.
						?statement0 ps:P436 "${releaseGroupId}".
					}
					LIMIT 100
				}
				OPTIONAL { ?item wdt:P1651 ?YouTube_video_ID. }
				OPTIONAL { ?item wdt:P3040 ?SoundCloud_ID. }
				OPTIONAL { ?item wdt:P6718 ?Music_video_entity_URL. }
			}`
				.replaceAll("\n", "")
				.replaceAll("\t", "");

		return WikiDataModule.runJob(
			"API_CALL",
			{
				url: "https://query.wikidata.org/sparql",
				params: {
					query: sparqlQuery
				}
			},
			this
		);
	}

	/**
	 * Get WikiData data from Spotify album id
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.spotifyAlbumId - Spotify album id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_GET_DATA_FROM_SPOTIFY_ALBUM(payload) {
		const { spotifyAlbumId } = payload;

		if (!spotifyAlbumId) throw new Error("Invalid Spotify album ID provided.");

		const sparqlQuery = `SELECT DISTINCT ?item ?itemLabel ?YouTube_playlist_ID ?SoundCloud_ID WHERE {
				SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
				{
					SELECT DISTINCT ?item WHERE {
						?item p:P2205 ?statement0.
						?statement0 ps:P2205 "${spotifyAlbumId}".
					}
					LIMIT 100
				}
				OPTIONAL { ?item wdt:P4300 ?YouTube_playlist_ID. }
				OPTIONAL { ?item wdt:P3040 ?SoundCloud_ID. }
			}`
			.replaceAll("\n", "")
			.replaceAll("\t", "");

		return WikiDataModule.runJob(
			"API_CALL",
			{
				url: "https://query.wikidata.org/sparql",
				params: {
					query: sparqlQuery
				}
			},
			this
		);
	}

	/**
	 * Get WikiData data from Spotify artist id
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.spotifyArtistId - Spotify artist id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_GET_DATA_FROM_SPOTIFY_ARTIST(payload) {
		const { spotifyArtistId } = payload;

		if (!spotifyArtistId) throw new Error("Invalid Spotify artist ID provided.");

		const sparqlQuery =
			`SELECT DISTINCT ?item ?itemLabel ?YouTube_channel_ID ?SoundCloud_ID ?MusicBrainz_artist_ID WHERE {
				SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE]". }
				{
					SELECT DISTINCT ?item WHERE {
						?item p:P1902 ?statement0.
						?statement0 ps:P1902 "${spotifyArtistId}".
					}
					LIMIT 100
				}
				OPTIONAL { ?item wdt:P2397 ?YouTube_channel_ID. }
				OPTIONAL { ?item wdt:P3040 ?SoundCloud_ID. }
				OPTIONAL { ?item wdt:P434 ?MusicBrainz_artist_ID. }
			}`
				.replaceAll("\n", "")
				.replaceAll("\t", "");

		return WikiDataModule.runJob(
			"API_CALL",
			{
				url: "https://query.wikidata.org/sparql",
				params: {
					query: sparqlQuery
				}
			},
			this
		);
	}

	/**
	 * Perform WikiData API call
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.url - request url
	 * @param {object} payload.params - request parameters
	 * @param {object} payload.quotaCost - request quotaCost
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_CALL(payload) {
		const { url, params } = payload;

		let genericApiRequest = await WikiDataModule.GenericApiRequestModel.findOne({
			url,
			params
		});
		if (genericApiRequest) return genericApiRequest._doc.responseData;

		await WikiDataModule.rateLimiter.continue();
		WikiDataModule.rateLimiter.restart();

		const { data: responseData } = await WikiDataModule.axios.get(url, {
			params,
			headers: {
				Accept: "application/sparql-results+json"
			},
			timeout: WikiDataModule.requestTimeout
		});

		if (responseData.error) throw new Error(responseData.error);

		genericApiRequest = new WikiDataModule.GenericApiRequestModel({
			url,
			params,
			responseData,
			date: Date.now()
		});
		genericApiRequest.save();

		return responseData;
	}
}

export default new _WikiDataModule();
