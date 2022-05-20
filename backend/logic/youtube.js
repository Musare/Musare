/* eslint-disable */

import async from "async";
import config from "config";

import * as rax from "retry-axios";
import axios from "axios";

import CoreClass from "../core";

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

let YouTubeModule;
let CacheModule;
let DBModule;

const quotas = [
	{
		type: "QUERIES_PER_DAY",
		limit: 10000
	},
	{
		type: "QUERIES_PER_MINUTE",
		limit: 1800000
	},
	{
		type: "QUERIES_PER_100_SECONDS",
		limit: 3000000
	}
];

const isQuotaExceeded = apiCalls => {
	const reversedApiCalls = apiCalls.slice().reverse();
	const sortedQuotas = quotas.sort((a, b) => a.limit > b.limit);

	let quotaExceeded = false;

	for (const quota of sortedQuotas) {
		let quotaUsed = 0;
		let dateCutoff = null;

		if (quota.type === "QUERIES_PER_MINUTE") dateCutoff = new Date() - 1000 * 60;
		else if (quota.type === "QUERIES_PER_100_SECONDS") dateCutoff = new Date() - 1000 * 100;
		else if (quota.type === "QUERIES_PER_DAY") {
			// Quota resets at midnight PT, this is my best guess to convert the current date to the last midnight PT
			dateCutoff = new Date();
			dateCutoff.setUTCMilliseconds(0);
			dateCutoff.setUTCSeconds(0);
			dateCutoff.setUTCMinutes(0);
			dateCutoff.setUTCHours(dateCutoff.getUTCHours() - 7);
			dateCutoff.setUTCHours(0);
		}

		for (const apiCall of reversedApiCalls) {
			if (apiCall.date >= dateCutoff) quotaUsed += apiCall.quotaCost;
			else break;
		}

		if (quotaUsed >= quota.limit) {
			quotaExceeded = true;
			break;
		}
	}

	return quotaExceeded;
};

class _YouTubeModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("youtube", {
			concurrency: 1,
			priorities: {
				GET_PLAYLIST: 11
			}
		});

		YouTubeModule = this;
	}

	/**
	 * Initialises the activities module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(async resolve => {
			CacheModule = this.moduleManager.modules.cache;
			DBModule = this.moduleManager.modules.db;

			this.youtubeApiRequestModel = this.YoutubeApiRequestModel = await DBModule.runJob("GET_MODEL", {
				modelName: "youtubeApiRequest"
			});

			this.rateLimiter = new RateLimitter(config.get("apis.youtube.rateLimit"));
			this.requestTimeout = config.get("apis.youtube.requestTimeout");

			this.axios = axios.create();
			this.axios.defaults.raxConfig = {
				instance: this.axios,
				retry: config.get("apis.youtube.retryAmount"),
				noResponseRetries: config.get("apis.youtube.retryAmount")
			};
			rax.attach(this.axios);

			this.youtubeApiRequestModel
				.find({ date: { $gte: new Date() - 2 * 24 * 60 * 60 * 1000 } }, { date: true, quotaCost: true, _id: false })
				.sort({ date: 1 })
				.exec((err, youtubeApiRequests) => {
					if (err) console.log("Couldn't load YouTube API requests.");
					else {
						this.apiCalls = youtubeApiRequests;
						resolve();
					}
				});
		});
	}

	/**
	 * Fetches a list of songs from Youtube's API
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.query - the query we'll pass to youtubes api
	 * @param {string} payload.pageToken - (optional) if this exists, will search search youtube for a specific page reference
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SEARCH(payload) {
		const params = {
			part: "snippet",
			q: payload.query,
			type: "video",
			maxResults: 10
		};

		if (payload.pageToken) params.pageToken = payload.pageToken;

		return new Promise((resolve, reject) => {
			YouTubeModule.runJob(
				"API_SEARCH",
				{
					params
				},
				this
			)
				.then(({ response }) => {
					const { data } = response;

					return resolve(data);
				})
				.catch(err => {
					YouTubeModule.log("ERROR", "SEARCH", `${err.message}`);
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	GET_QUOTA_STATUS(payload) {
		return new Promise((resolve, reject) => {
			const fromDate = payload.fromDate ? new Date(payload.fromDate) : new Date();

			YouTubeModule.youtubeApiRequestModel
				.find({ date: { $gte: fromDate - 2 * 24 * 60 * 60 * 1000, $lte: fromDate } }, { date: true, quotaCost: true, _id: false })
				.sort({ date: 1 })
				.exec((err, youtubeApiRequests) => {
					if (err) reject(new Error("Couldn't load YouTube API requests."));
					else {
						const reversedApiCalls = youtubeApiRequests.slice().reverse();
						const sortedQuotas = quotas.sort((a, b) => a.limit > b.limit);
						const status = {};

						for (const quota of sortedQuotas) {
							status[quota.type] = {
								quotaUsed: 0,
								limit: quota.limit,
								quotaExceeded: false
							};
							let dateCutoff = null;

							if (quota.type === "QUERIES_PER_MINUTE") dateCutoff = new Date(fromDate) - 1000 * 60;
							else if (quota.type === "QUERIES_PER_100_SECONDS") dateCutoff = new Date(fromDate) - 1000 * 100;
							else if (quota.type === "QUERIES_PER_DAY") {
								// Quota resets at midnight PT, this is my best guess to convert the current date to the last midnight PT
								dateCutoff = new Date(fromDate);
								dateCutoff.setUTCMilliseconds(0);
								dateCutoff.setUTCSeconds(0);
								dateCutoff.setUTCMinutes(0);
								dateCutoff.setUTCHours(dateCutoff.getUTCHours() - 7);
								dateCutoff.setUTCHours(0);
							}

							for (const apiCall of reversedApiCalls) {
								if (apiCall.date >= dateCutoff) status[quota.type].quotaUsed += apiCall.quotaCost;
								else break;
							}

							if (status[quota.type].quotaUsed >= quota.limit && !status[quota.type].quotaExceeded)
								status[quota.type].quotaExceeded = true;
						}

						resolve({ status });
					}
				});
		});
	}

	/**
	 * Gets the details of a song using the YouTube API
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.youtubeId - the YouTube API id of the song
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SONG(payload) {
		return new Promise((resolve, reject) => {
			const params = {
				part: "snippet,contentDetails,statistics,status",
				id: payload.youtubeId
			};

			YouTubeModule.runJob("API_GET_VIDEOS", { params }, this)
				.then(({ response }) => {
					const { data } = response;
					if (data.items[0] === undefined)
						return reject(new Error("The specified video does not exist or cannot be publicly accessed."));

					// TODO Clean up duration converter
					let dur = data.items[0].contentDetails.duration;

					dur = dur.replace("PT", "");

					let duration = 0;

					dur = dur.replace(/([\d]*)H/, (v, v2) => {
						v2 = Number(v2);
						duration = v2 * 60 * 60;
						return "";
					});

					dur = dur.replace(/([\d]*)M/, (v, v2) => {
						v2 = Number(v2);
						duration += v2 * 60;
						return "";
					});

					// eslint-disable-next-line no-unused-vars
					dur = dur.replace(/([\d]*)S/, (v, v2) => {
						v2 = Number(v2);
						duration += v2;
						return "";
					});

					const song = {
						youtubeId: data.items[0].id,
						title: data.items[0].snippet.title,
						thumbnail: data.items[0].snippet.thumbnails.default.url,
						duration
					};

					return resolve({ song });
				})
				.catch(err => {
					YouTubeModule.log("ERROR", "GET_SONG", `${err.message}`);
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Gets the id of the channel upload playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.id - the id of the YouTube channel. Optional: can be left out if specifying a username.
	 * @param {string} payload.username - the username of the YouTube channel. Only gets used if no id is specified.
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_CHANNEL_UPLOADS_PLAYLIST_ID(payload) {
		return new Promise((resolve, reject) => {
			const params = {
				part: "id,contentDetails"
			};

			if (payload.id) params.id = payload.id;
			else params.forUsername = payload.username;

			YouTubeModule.runJob(
				"API_GET_CHANNELS",
				{
					params
				},
				this
			)
				.then(({ response }) => {
					const { data } = response;

					if (data.pageInfo.totalResults === 0) return reject(new Error("Channel not found."));

					const playlistId = data.items[0].contentDetails.relatedPlaylists.uploads;

					return resolve({ playlistId });
				})
				.catch(err => {
					YouTubeModule.log("ERROR", "GET_CHANNEL_UPLOADS_PLAYLIST_ID", `${err.message}`);
					if (err.message === "Request failed with status code 404") {
						return reject(new Error("Channel not found. Is the channel public/unlisted?"));
					}
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Gets the id of the channel from the custom URL
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.customUrl - the customUrl of the YouTube channel
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_CHANNEL_ID_FROM_CUSTOM_URL(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const params = {
							part: "snippet",
							type: "channel",
							maxResults: 50
						};

						params.q = payload.customUrl;

						YouTubeModule.runJob(
							"API_SEARCH",
							{
								params
							},
							this
						)
							.then(({ response }) => {
								const { data } = response;

								if (data.pageInfo.totalResults === 0) return next("Channel not found.");

								const channelIds = data.items.map(item => item.id.channelId);

								return next(null, channelIds);
							})
							.catch(err => {
								next(err);
							});
					},

					(channelIds, next) => {
						const params = {
							part: "snippet",
							id: channelIds.join(","),
							maxResults: 50
						};

						YouTubeModule.runJob(
							"API_GET_CHANNELS",
							{
								params
							},
							this
						)
							.then(({ response }) => {
								const { data } = response;

								if (data.pageInfo.totalResults === 0) return next("Channel not found.");

								let channelId = null;
								for (const item of data.items) {
									if (
										item.snippet.customUrl &&
										item.snippet.customUrl.toLowerCase() === payload.customUrl.toLowerCase()
									) {
										channelId = item.id;
										break;
									}
								}

								if (!channelId) return next("Channel not found.");

								return next(null, channelId);
							})
							.catch(err => {
								next(err);
							});
					}
				],
				(err, channelId) => {
					if (err) {
						YouTubeModule.log("ERROR", "GET_CHANNEL_ID_FROM_CUSTOM_URL", `${err.message}`);
						if (err.message === "Request failed with status code 404") {
							return reject(new Error("Channel not found. Is the channel public/unlisted?"));
						}
						return reject(new Error("An error has occured. Please try again later."));
					}

					return resolve({ channelId });
				}
			);
		});
	}

	/**
	 * Returns an array of songs taken from a YouTube playlist
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {boolean} payload.musicOnly - whether to return music videos or all videos in the playlist
	 * @param {string} payload.url - the url of the YouTube playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLIST(payload) {
		return new Promise((resolve, reject) => {
			const regex = /[\\?&]list=([^&#]*)/;
			const splitQuery = regex.exec(payload.url);

			if (!splitQuery) {
				YouTubeModule.log("ERROR", "GET_PLAYLIST", "Invalid YouTube playlist URL query.");
				reject(new Error("Invalid playlist URL."));
				return;
			}
			const playlistId = splitQuery[1];

			async.waterfall(
				[
					next => {
						let songs = [];
						let nextPageToken = "";

						async.whilst(
							next => {
								YouTubeModule.log(
									"INFO",
									`Getting playlist progress for job (${this.toString()}): ${songs.length
									} songs gotten so far. Is there a next page: ${nextPageToken !== undefined}.`
								);
								next(null, nextPageToken !== undefined);
							},
							next => {
								// Add 250ms delay between each job request
								setTimeout(() => {
									YouTubeModule.runJob("GET_PLAYLIST_PAGE", { playlistId, nextPageToken }, this)
										.then(response => {
											songs = songs.concat(response.songs);
											nextPageToken = response.nextPageToken;
											next();
										})
										.catch(err => next(err));
								}, 250);
							},
							err => next(err, songs)
						);
					},

					(songs, next) =>
						next(
							null,
							songs.map(song => song.contentDetails.videoId)
						),

					(songs, next) => {
						if (!payload.musicOnly) return next(true, { songs });
						return YouTubeModule.runJob("FILTER_MUSIC_VIDEOS", { videoIds: songs.slice() }, this)
							.then(filteredSongs => next(null, { filteredSongs, songs }))
							.catch(next);
					}
				],
				(err, response) => {
					if (err && err !== true) {
						YouTubeModule.log("ERROR", "GET_PLAYLIST", "Some error has occurred.", err.message);
						reject(new Error(err.message));
					} else {
						resolve({ songs: response.filteredSongs ? response.filteredSongs.videoIds : response.songs });
					}
				}
			);
		});
	}

	/**
	 * Returns a a page from a YouTube playlist. Is used internally by GET_PLAYLIST and GET_CHANNEL.
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {boolean} payload.playlistId - the playlist id to get videos from
	 * @param {boolean} payload.nextPageToken - the nextPageToken to use
	 * @param {string} payload.url - the url of the YouTube playlist
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_PLAYLIST_PAGE(payload) {
		return new Promise((resolve, reject) => {
			const params = {
				part: "contentDetails",
				playlistId: payload.playlistId,
				maxResults: 50
			};

			if (payload.nextPageToken) params.pageToken = payload.nextPageToken;

			YouTubeModule.runJob(
				"API_GET_PLAYLIST_ITEMS",
				{
					params
				},
				this
			)
				.then(({ response }) => {
					const { data } = response;

					const songs = data.items;

					if (data.nextPageToken) return resolve({ nextPageToken: data.nextPageToken, songs });

					return resolve({ songs });
				})
				.catch(err => {
					YouTubeModule.log("ERROR", "GET_PLAYLIST_PAGE", `${err.message}`);
					if (err.message === "Request failed with status code 404") {
						return reject(new Error("Playlist not found. Is the playlist public/unlisted?"));
					}
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Filters a list of YouTube videos so that they only contains videos with music. Is used internally by GET_PLAYLIST
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {Array} payload.videoIds - an array of YouTube videoIds to filter through
	 * @param {Array} payload.page - the current page/set of video's to get, starting at 0. If left null, 0 is assumed. Will recurse.
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	FILTER_MUSIC_VIDEOS(payload) {
		return new Promise((resolve, reject) => {
			const page = payload.page ? payload.page : 0;

			const videosPerPage = 50;

			const localVideoIds = payload.videoIds.splice(page * 50, videosPerPage);

			if (localVideoIds.length === 0) {
				resolve({ videoIds: [] });
				return;
			}

			const params = {
				part: "topicDetails",
				id: localVideoIds.join(","),
				maxResults: videosPerPage
			};

			YouTubeModule.runJob("API_GET_VIDEOS", { params }, this)
				.then(({ response }) => {
					const { data } = response;

					const videoIds = [];

					data.items.forEach(item => {
						const videoId = item.id;

						if (!item.topicDetails) return;
						if (item.topicDetails.topicCategories.indexOf("https://en.wikipedia.org/wiki/Music") !== -1)
							videoIds.push(videoId);
					});

					return YouTubeModule.runJob(
						"FILTER_MUSIC_VIDEOS",
						{ videoIds: payload.videoIds, page: page + 1 },
						this
					)
						.then(result => resolve({ videoIds: videoIds.concat(result.videoIds) }))
						.catch(err => reject(err));
				})
				.catch(err => {
					YouTubeModule.log("ERROR", "FILTER_MUSIC_VIDEOS", `${err.message}`);
					return reject(new Error("Failed to find playlist from YouTube"));
				});
		});
	}

	/**
	 * Returns an array of songs taken from a YouTube channel
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {boolean} payload.musicOnly - whether to return music videos or all videos in the channel
	 * @param {string} payload.url - the url of the YouTube channel
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_CHANNEL(payload) {
		return new Promise((resolve, reject) => {
			const regex =
				/\.[\w]+\/(?:(?:channel\/(UC[0-9A-Za-z_-]{21}[AQgw]))|(?:user\/?([\w-]+))|(?:c\/?([\w-]+))|(?:\/?([\w-]+)))/;
			const splitQuery = regex.exec(payload.url);

			if (!splitQuery) {
				YouTubeModule.log("ERROR", "GET_CHANNEL", "Invalid YouTube channel URL query.");
				reject(new Error("Invalid playlist URL."));
				return;
			}
			const channelId = splitQuery[1];
			const channelUsername = splitQuery[2];
			const channelCustomUrl = splitQuery[3];
			const channelUsernameOrCustomUrl = splitQuery[4];

			console.log(`Channel id: ${channelId}`);
			console.log(`Channel username: ${channelUsername}`);
			console.log(`Channel custom URL: ${channelCustomUrl}`);
			console.log(`Channel username or custom URL: ${channelUsernameOrCustomUrl}`);

			async.waterfall(
				[

					next => {
						const payload = {};
						if (channelId) payload.id = channelId;
						else if (channelUsername) payload.username = channelUsername;
						else return next(null, true, null);

						return YouTubeModule.runJob("GET_CHANNEL_UPLOADS_PLAYLIST_ID", payload, this)
							.then(({ playlistId }) => {
								next(null, false, playlistId);
							})
							.catch(err => {
								if (err.message === "Channel not found. Is the channel public/unlisted?") next(null, true, null);
								else next(err);
							});
					},

					(getUsernameFromCustomUrl, playlistId, next) => {
						if (!getUsernameFromCustomUrl) return next(null, playlistId);

						const payload = {};
						if (channelCustomUrl) payload.customUrl = channelCustomUrl;
						else if (channelUsernameOrCustomUrl) payload.customUrl = channelUsernameOrCustomUrl;
						else next("No proper URL provided.");

						YouTubeModule.runJob("GET_CHANNEL_ID_FROM_CUSTOM_URL", payload, this)
							.then(({ channelId }) => {
								YouTubeModule.runJob("GET_CHANNEL_UPLOADS_PLAYLIST_ID", { id: channelId }, this)
									.then(({ playlistId }) => {
										next(null, playlistId);
									})
									.catch(err => next(err));
							})
							.catch(err => next(err));
					},

					(playlistId, next) => {
						let songs = [];
						let nextPageToken = "";

						async.whilst(
							next => {
								YouTubeModule.log(
									"INFO",
									`Getting channel progress for job (${this.toString()}): ${songs.length
									} songs gotten so far. Is there a next page: ${nextPageToken !== undefined}.`
								);
								next(null, nextPageToken !== undefined);
							},
							next => {
								// Add 250ms delay between each job request
								setTimeout(() => {
									YouTubeModule.runJob("GET_PLAYLIST_PAGE", { playlistId, nextPageToken }, this)
										.then(response => {
											songs = songs.concat(response.songs);
											nextPageToken = response.nextPageToken;
											next();
										})
										.catch(err => next(err));
								}, 250);
							},
							err => next(err, songs)
						);
					},

					(songs, next) =>
						next(
							null,
							songs.map(song => song.contentDetails.videoId)
						),

					(songs, next) => {
						if (!payload.musicOnly) return next(true, { songs });
						return YouTubeModule.runJob("FILTER_MUSIC_VIDEOS", { videoIds: songs.slice() }, this)
							.then(filteredSongs => next(null, { filteredSongs, songs }))
							.catch(next);
					}
				],
				(err, response) => {
					if (err && err !== true) {
						YouTubeModule.log("ERROR", "GET_CHANNEL", "Some error has occurred.", err.message);
						reject(new Error(err.message));
					} else {
						resolve({ songs: response.filteredSongs ? response.filteredSongs.videoIds : response.songs });
					}
				}
			);
		});
	}

	API_GET_VIDEOS(payload) {
		return new Promise((resolve, reject) => {
			const { params } = payload;

			YouTubeModule.runJob(
				"API_CALL",
				{
					url: "https://www.googleapis.com/youtube/v3/videos",
					params: {
						key: config.get("apis.youtube.key"),
						...params
					},
					quotaCost: 1
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

	API_GET_PLAYLIST_ITEMS(payload) {
		return new Promise((resolve, reject) => {
			const { params } = payload;

			YouTubeModule.runJob(
				"API_CALL",
				{
					url: "https://www.googleapis.com/youtube/v3/playlistItems",
					params: {
						key: config.get("apis.youtube.key"),
						...params
					},
					quotaCost: 1
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

	API_GET_CHANNELS(payload) {
		return new Promise((resolve, reject) => {
			const { params } = payload;

			YouTubeModule.runJob(
				"API_CALL",
				{
					url: "https://www.googleapis.com/youtube/v3/channels",
					params: {
						key: config.get("apis.youtube.key"),
						...params
					},
					quotaCost: 1
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

	API_SEARCH(payload) {
		return new Promise((resolve, reject) => {
			const { params } = payload;

			YouTubeModule.runJob(
				"API_CALL",
				{
					url: "https://www.googleapis.com/youtube/v3/search",
					params: {
						key: config.get("apis.youtube.key"),
						...params
					},
					quotaCost: 100
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

	API_CALL(payload) {
		return new Promise((resolve, reject) => {
			const { url, params, quotaCost } = payload;

			const quotaExceeded = isQuotaExceeded(YouTubeModule.apiCalls);

			if (quotaExceeded) reject(new Error("Quota has been exceeded. Please wait a while."));
			else {
				const youtubeApiRequest = new YouTubeModule.YoutubeApiRequestModel({
					url,
					date: Date.now(),
					quotaCost
				});

				youtubeApiRequest.save();

				const { key, ...keylessParams } = payload.params;
				CacheModule.runJob(
					"HSET",
					{
						table: "youtubeApiRequestParams",
						key: youtubeApiRequest._id.toString(),
						value: JSON.stringify(keylessParams)
					},
					this
				).then();

				YouTubeModule.apiCalls.push({ date: youtubeApiRequest.date, quotaCost });

				YouTubeModule.axios
					.get(url, {
						params,
						timeout: YouTubeModule.requestTimeout
					})
					.then(response => {
						if (response.data.error) {
							reject(new Error(response.data.error));
						} else {
							CacheModule.runJob(
								"HSET",
								{
									table: "youtubeApiRequestResults",
									key: youtubeApiRequest._id.toString(),
									value: JSON.stringify(response.data)
								},
								this
							).then();

							resolve({ response });
						}
					})
					.catch(err => {
						reject(err);
					});
			}
		});
	}

	GET_API_REQUESTS(payload) {
		return new Promise((resolve, reject) => {
			const fromDate = payload.fromDate ? new Date(payload.fromDate) : new Date();

			YouTubeModule.youtubeApiRequestModel
				.find({ date: { $lte: fromDate } })
				.sort({ date: -1 })
				.exec((err, youtubeApiRequests) => {
					if (err) reject(new Error("Couldn't load YouTube API requests."));
					else {
						resolve({ apiRequests: youtubeApiRequests });
					}
				});
		});
	}

	GET_API_REQUEST(payload) {
		return new Promise((resolve, reject) => {
			const { apiRequestId } = payload;
			
			async.waterfall(
				[
					next => {
						YouTubeModule.youtubeApiRequestModel
							.findOne({ _id: apiRequestId })
							.exec(next);
					},

					(apiRequest, next) => {
						CacheModule.runJob(
							"HGET",
							{
								table: "youtubeApiRequestParams",
								key: apiRequestId.toString()
							},
							this
						).then(apiRequestParams => {
							next(null, {
								...apiRequest._doc,
								params: apiRequestParams
							});
						}
						).catch(err => next(err));
					},

					(apiRequest, next) => {
						CacheModule.runJob(
							"HGET",
							{
								table: "youtubeApiRequestResults",
								key: apiRequestId.toString()
							},
							this
						).then(apiRequestResults => {
							next(null, {
								...apiRequest,
								results: apiRequestResults
							});
						}).catch(err => next(err));
					}
				],
				(err, apiRequest) => {
					if (err) reject(new Error(err));
					else resolve({ apiRequest });
				}
			);
		});
	}
}

export default new _YouTubeModule();
