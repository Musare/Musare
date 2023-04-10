import axios from "axios";

import CoreClass from "../core";
import { MUSARE_VERSION } from "..";

class RateLimitter {
	/**
	 * Constructor
	 *
	 * @param {number} timeBetween - The time between each allowed MusicBrainz request
	 */
	constructor(timeBetween) {
		this.dateStarted = Date.now();
		this.timeBetween = timeBetween;
	}

	/**
	 * Returns a promise that resolves whenever the ratelimit of a MusicBrainz request is done
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

let MusicBrainzModule;
let DBModule;

class _MusicBrainzModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("musicbrainz", {
			concurrency: 10
			// priorities: {
			// 	GET_PLAYLIST: 11
			// }
		});

		MusicBrainzModule = this;
	}

	/**
	 * Initialises the MusicBrainz module
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
	 * Perform MusicBrainz API call
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.url - request url
	 * @param {object} payload.params - request parameters
	 * @param {object} payload.quotaCost - request quotaCost
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async API_CALL(payload) {
		const { url, params } = payload;

		let genericApiRequest = await MusicBrainzModule.GenericApiRequestModel.findOne({
			url,
			params
		});
		if (genericApiRequest) {
			if (genericApiRequest._doc.responseData.error) throw new Error(genericApiRequest._doc.responseData.error);
			return genericApiRequest._doc.responseData;
		}

		await MusicBrainzModule.rateLimiter.continue();
		MusicBrainzModule.rateLimiter.restart();

		const responseData = await new Promise((resolve, reject) => {
			MusicBrainzModule.axios
				.get(url, {
					params,
					headers: {
						"User-Agent": `Musare/${MUSARE_VERSION} ( https://github.com/Musare/Musare )` // TODO set this in accordance to https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
					},
					timeout: MusicBrainzModule.requestTimeout
				})
				.then(({ data: responseData }) => {
					resolve(responseData);
				})
				.catch(err => {
					if (err.response.status === 404) {
						resolve(err.response.data);
					} else reject(err);
				});
		});

		if (responseData.error && responseData.error !== "Not Found") throw new Error(responseData.error);

		genericApiRequest = new MusicBrainzModule.GenericApiRequestModel({
			url,
			params,
			responseData,
			date: Date.now()
		});
		genericApiRequest.save();

		if (responseData.error) throw new Error(responseData.error);

		return responseData;
	}
}

export default new _MusicBrainzModule();
