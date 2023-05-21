import mongoose from "mongoose";
import async from "async";
import config from "config";

import * as rax from "retry-axios";
import axios from "axios";

import CoreClass from "../core";

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

let YouTubeModule;
let CacheModule;
let DBModule;
let MediaModule;
let SongsModule;
let StationsModule;
let PlaylistsModule;
let WSModule;

const isQuotaExceeded = apiCalls => {
	const reversedApiCalls = apiCalls.slice().reverse();
	const quotas = config.get("apis.youtube.quotas").slice();
	const sortedQuotas = quotas.sort((a, b) => a.limit > b.limit);

	let quotaExceeded = false;

	sortedQuotas.forEach(quota => {
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

		reversedApiCalls.forEach(apiCall => {
			if (apiCall.date >= dateCutoff) quotaUsed += apiCall.quotaCost;
		});

		if (quotaUsed >= quota.limit) {
			quotaExceeded = true;
		}
	});

	return quotaExceeded;
};

class _YouTubeModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("youtube", {
			concurrency: 10,
			priorities: {
				GET_PLAYLIST: 11
			}
		});

		YouTubeModule = this;
	}

	/**
	 * Initialises the activities module
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

		this.youtubeApiRequestModel = this.YoutubeApiRequestModel = await DBModule.runJob("GET_MODEL", {
			modelName: "youtubeApiRequest"
		});

		this.youtubeVideoModel = this.YoutubeVideoModel = await DBModule.runJob("GET_MODEL", {
			modelName: "youtubeVideo"
		});

		this.youtubeChannelModel = this.YoutubeChannelModel = await DBModule.runJob("GET_MODEL", {
			modelName: "youtubeChannel"
		});

		return new Promise(resolve => {
			CacheModule.runJob("SUB", {
				channel: "youtube.removeYoutubeApiRequest",
				cb: requestId => {
					WSModule.runJob("EMIT_TO_ROOM", {
						room: `view-api-request.${requestId}`,
						args: ["event:youtubeApiRequest.removed"]
					});

					WSModule.runJob("EMIT_TO_ROOM", {
						room: "admin.youtube",
						args: ["event:admin.youtubeApiRequest.removed", { data: { requestId } }]
					});
				}
			});

			CacheModule.runJob("SUB", {
				channel: "youtube.removeVideos",
				cb: videoIds => {
					const videos = Array.isArray(videoIds) ? videoIds : [videoIds];
					videos.forEach(videoId => {
						WSModule.runJob("EMIT_TO_ROOM", {
							room: `view-media.youtube:${videoId}`,
							args: ["event:youtubeVideo.removed"]
						});

						WSModule.runJob("EMIT_TO_ROOM", {
							room: "admin.youtubeVideos",
							args: ["event:admin.youtubeVideo.removed", { data: { videoId } }]
						});

						WSModule.runJob("EMIT_TO_ROOMS", {
							rooms: ["import-album", "edit-songs"],
							args: ["event:admin.youtubeVideo.removed", { videoId }]
						});
					});
				}
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
				.find(
					{ date: { $gte: new Date() - 2 * 24 * 60 * 60 * 1000 } },
					{ date: true, quotaCost: true, _id: false }
				)
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
					if (err.message === "Searching with YouTube is disabled.") return reject(err);
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Returns details about the YouTube quota usage
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.fromDate - date to select requests up to
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_QUOTA_STATUS(payload) {
		return new Promise((resolve, reject) => {
			const fromDate = payload.fromDate ? new Date(payload.fromDate) : new Date();

			YouTubeModule.youtubeApiRequestModel
				.find(
					{ date: { $gte: fromDate - 2 * 24 * 60 * 60 * 1000, $lte: fromDate } },
					{ date: true, quotaCost: true, _id: false }
				)
				.sort({ date: 1 })
				.exec((err, youtubeApiRequests) => {
					if (err) reject(new Error("Couldn't load YouTube API requests."));
					else {
						const reversedApiCalls = youtubeApiRequests.slice().reverse();
						const quotas = config.get("apis.youtube.quotas").slice();
						const sortedQuotas = quotas.sort((a, b) => a.limit > b.limit);
						const status = {};

						sortedQuotas.forEach(quota => {
							status[quota.type] = {
								title: quota.title,
								quotaUsed: 0,
								limit: quota.limit,
								quotaExceeded: false
							};
							let dateCutoff = null;

							if (quota.type === "QUERIES_PER_MINUTE") dateCutoff = new Date(fromDate) - 1000 * 60;
							else if (quota.type === "QUERIES_PER_100_SECONDS")
								dateCutoff = new Date(fromDate) - 1000 * 100;
							else if (quota.type === "QUERIES_PER_DAY") {
								// Quota resets at midnight PT, this is my best guess to convert the current date to the last midnight PT
								dateCutoff = new Date(fromDate);
								dateCutoff.setUTCMilliseconds(0);
								dateCutoff.setUTCSeconds(0);
								dateCutoff.setUTCMinutes(0);
								dateCutoff.setUTCHours(dateCutoff.getUTCHours() - 7);
								dateCutoff.setUTCHours(0);
							}

							reversedApiCalls.forEach(apiCall => {
								if (apiCall.date >= dateCutoff) status[quota.type].quotaUsed += apiCall.quotaCost;
							});

							if (status[quota.type].quotaUsed >= quota.limit && !status[quota.type].quotaExceeded)
								status[quota.type].quotaExceeded = true;
						});

						resolve({ status });
					}
				});
		});
	}

	/**
	 * Returns YouTube quota chart data
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.timePeriod - either hours or days
	 * @param {string} payload.startDate - beginning date
	 * @param {string} payload.endDate - end date
	 * @param {string} payload.dataType - either usage or count
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_QUOTA_CHART_DATA(payload) {
		return new Promise((resolve, reject) => {
			const { timePeriod, startDate, endDate, dataType } = payload;

			// const timePeriod = "hours";
			// const startDate = new Date("2022-05-20 00:00:00");
			// const endDate = new Date("2022-05-21 00:00:00");

			// const timePeriod = "days";
			// const startDate = new Date("2022-05-15 00:00:00");
			// const endDate = new Date("2022-05-21 00:00:00");
			// const endDate = new Date("2022-05-30 00:00:00");

			// const dataType = "usage";
			// const dataType = "count";

			async.waterfall(
				[
					next => {
						let timeRanges = [];
						if (timePeriod === "hours") {
							startDate.setMinutes(0, 0, 0);
							endDate.setMinutes(0, 0, 0);
							const lastDate = new Date(startDate);
							do {
								const newDate = new Date(lastDate.getTime() + 1000 * 60 * 60);

								timeRanges.push({
									startDate: new Date(lastDate),
									endDate: newDate
								});

								lastDate.setTime(newDate.getTime());
							} while (lastDate.getTime() < endDate.getTime());
							if (timeRanges.length === 0 || timeRanges.length > 24)
								return next("No valid time ranges specified.");
							timeRanges = timeRanges.map(timeRange => ({
								...timeRange,
								label: `${timeRange.startDate.getHours().toString().padStart(2, "0")}:00`
							}));
						} else if (timePeriod === "days") {
							startDate.setHours(0, 0, 0, 0);
							endDate.setHours(0, 0, 0, 0);
							const lastDate = new Date(startDate);
							do {
								const newDate = new Date(lastDate.getTime() + 1000 * 60 * 60 * 24);

								timeRanges.push({
									startDate: new Date(lastDate),
									endDate: newDate
								});

								lastDate.setTime(newDate.getTime());
							} while (lastDate.getTime() < endDate.getTime());
							if (timeRanges.length === 0 || timeRanges.length > 31)
								return next("No valid time ranges specified.");
							const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
							if (timeRanges.length <= 7)
								timeRanges = timeRanges.map(timeRange => ({
									...timeRange,
									label: days[timeRange.startDate.getDay()]
								}));
							else
								timeRanges = timeRanges.map(timeRange => ({
									...timeRange,
									label: `${timeRange.startDate.getDate().toString().padStart(2, "0")}-${(
										timeRange.startDate.getMonth() + 1
									)
										.toString()
										.padStart(2, "0")}`
								}));
						}

						return next(null, timeRanges);
					},

					(timeRanges, next) => {
						YouTubeModule.youtubeApiRequestModel
							.find({
								date: { $gte: startDate, $lte: endDate }
							})
							.sort({ date: 1 })
							.exec((err, youtubeApiRequests) => {
								next(err, timeRanges, youtubeApiRequests);
							});
					},

					(timeRanges, youtubeApiRequests, next) => {
						const regex = /https:\/\/www\.googleapis\.com\/youtube\/v3\/(.+)/;
						const requestTypes = Object.fromEntries(
							youtubeApiRequests
								.map(youtubeApiRequest => regex.exec(youtubeApiRequest.url)[1])
								.filter((requestType, index, array) => array.indexOf(requestType) === index)
								.map(requestType => [requestType, 0])
						);
						timeRanges = timeRanges.map(timeRange => ({
							...timeRange,
							data: { total: 0, ...requestTypes }
						}));

						youtubeApiRequests.forEach(youtubeApiRequest => {
							timeRanges.forEach(timeRange => {
								if (
									timeRange.startDate <= youtubeApiRequest.date &&
									timeRange.endDate >= youtubeApiRequest.date
								) {
									const requestType = regex.exec(youtubeApiRequest.url)[1];
									if (!timeRange.data[requestType]) timeRange.data[requestType] = 0;

									if (dataType === "usage") {
										timeRange.data[requestType] += youtubeApiRequest.quotaCost;
										timeRange.data.total += youtubeApiRequest.quotaCost;
									} else if (dataType === "count") {
										timeRange.data[requestType] += 1;
										timeRange.data.total += 1;
									}
								}
							});
						});

						next(null, timeRanges);
					},

					(timeRanges, next) => {
						const chartData = {};
						chartData.labels = timeRanges.map(timeRange => timeRange.label);
						const datasetTypes = Object.keys(timeRanges[0].data);
						const colors = {
							total: "rgb(2, 166, 242)",
							videos: "rgb(166, 2, 242)",
							search: "rgb(242, 2, 166)",
							channels: "rgb(2, 242, 166)",
							playlistItems: "rgb(242, 166, 2)"
						};
						chartData.datasets = datasetTypes.map(datasetType => {
							let label;
							switch (datasetType) {
								case "total":
									label = "Total";
									break;
								case "videos":
									label = "Videos";
									break;
								case "search":
									label = "Search";
									break;
								case "playlistItems":
									label = "Playlist Items";
									break;
								default:
									label = datasetType;
							}
							return {
								label,
								borderColor: colors[datasetType],
								backgroundColor: colors[datasetType],
								data: timeRanges.map(timeRange => timeRange.data[datasetType])
							};
						});

						next(null, chartData);
					}
				],
				(err, chartData) => {
					if (err) reject(err);
					else resolve(chartData);
				}
			);
		});
	}

	/**
	 * Gets the id of the channel upload playlist
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
					if (err.message === "Request failed with status code 404")
						return reject(new Error("Channel not found. Is the channel public/unlisted?"));
					if (err.message === "Searching with YouTube is disabled.") return reject(err);
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Gets the id of the channel from the custom URL
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
								data.items.forEach(item => {
									if (
										item.snippet.customUrl &&
										item.snippet.customUrl.toLowerCase() === payload.customUrl.toLowerCase()
									) {
										channelId = item.id;
									}
								});

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
						YouTubeModule.log("ERROR", "GET_CHANNEL_ID_FROM_CUSTOM_URL", `${err.message || err}`);
						if (err.message === "Request failed with status code 404")
							return reject(new Error("Channel not found. Is the channel public/unlisted?"));
						if (err.message === "Searching with YouTube is disabled.") return reject(err);
						return reject(new Error("An error has occured. Please try again later."));
					}

					return resolve({ channelId });
				}
			);
		});
	}

	/**
	 * Returns an array of songs taken from a YouTube playlist
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
			const maxPages = Number.parseInt(config.get("apis.youtube.maxPlaylistPages"));

			let currentPage = 0;

			async.waterfall(
				[
					next => {
						let songs = [];
						let nextPageToken = "";

						async.whilst(
							next => {
								YouTubeModule.log(
									"INFO",
									`Getting playlist progress for job (${this.toString()}): ${
										songs.length
									} songs gotten so far. Is there a next page: ${nextPageToken !== undefined}.`
								);
								next(null, nextPageToken !== undefined && currentPage < maxPages);
							},
							next => {
								currentPage += 1;
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
	 * Returns a a page from a YouTube playlist. Is used internally by GET_PLAYLIST and GET_CHANNEL_VIDEOS.
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
					if (err.message === "Request failed with status code 404")
						return reject(new Error("Playlist not found. Is the playlist public/unlisted?"));
					return reject(new Error("An error has occured. Please try again later."));
				});
		});
	}

	/**
	 * Filters a list of YouTube videos so that they only contains videos with music. Is used internally by GET_PLAYLIST
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
	 * @param {object} payload - object that contains the payload
	 * @param {boolean} payload.musicOnly - whether to return music videos or all videos in the channel
	 * @param {boolean} payload.disableSearch - whether to allow searching for custom url/username
	 * @param {string} payload.url - the url of the YouTube channel
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_CHANNEL_VIDEOS(payload) {
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

			const disableSearch = payload.disableSearch || false;

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
								if (err.message === "Channel not found. Is the channel public/unlisted?")
									next(null, true, null);
								else next(err);
							});
					},

					(getUsernameFromCustomUrl, playlistId, next) => {
						if (!getUsernameFromCustomUrl) return next(null, playlistId);

						if (disableSearch)
							return next(
								"Importing with this type of URL is disabled. Please provide a channel URL with the channel ID."
							);
						const payload = {};
						if (channelCustomUrl) payload.customUrl = channelCustomUrl;
						else if (channelUsernameOrCustomUrl) payload.customUrl = channelUsernameOrCustomUrl;
						else return next("No proper URL provided.");

						return YouTubeModule.runJob("GET_CHANNEL_ID_FROM_CUSTOM_URL", payload, this)
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
									`Getting channel progress for job (${this.toString()}): ${
										songs.length
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
						YouTubeModule.log("ERROR", "GET_CHANNEL", "Some error has occurred.", err.message || err);
						reject(new Error(err.message || err));
					} else {
						resolve({ songs: response.filteredSongs ? response.filteredSongs.videoIds : response.songs });
					}
				}
			);
		});
	}

	/**
	 * Perform YouTube API get videos request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
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

	/**
	 * Perform YouTube API get playlist items request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
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

	/**
	 * Perform YouTube API get channels request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
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

	/**
	 * Perform YouTube API search request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.params - request parameters
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	API_SEARCH(payload) {
		return new Promise((resolve, reject) => {
			const { params } = payload;

			if (config.get("experimental.disable_youtube_search")) {
				reject(new Error("Searching with YouTube is disabled."));
				return;
			}

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

	/**
	 * Perform YouTube API call
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.url - request url
	 * @param {object} payload.params - request parameters
	 * @param {object} payload.quotaCost - request quotaCost
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
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

				const { ...keylessParams } = payload.params;
				CacheModule.runJob("HSET", {
					table: "youtubeApiRequestParams",
					key: youtubeApiRequest._id.toString(),
					value: JSON.stringify(keylessParams)
				}).then();

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
							CacheModule.runJob("HSET", {
								table: "youtubeApiRequestResults",
								key: youtubeApiRequest._id.toString(),
								value: JSON.stringify(response.data)
							}).then();

							resolve({ response });
						}
					})
					.catch(err => {
						reject(err);
					});
			}
		});
	}

	/**
	 * Fetch all api requests
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.fromDate - data to fetch requests up to
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
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

	/**
	 * Fetch an api request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.apiRequestId - the api request id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_API_REQUEST(payload) {
		return new Promise((resolve, reject) => {
			const { apiRequestId } = payload;

			async.waterfall(
				[
					next => {
						YouTubeModule.youtubeApiRequestModel.findOne({ _id: apiRequestId }).exec(next);
					},

					(apiRequest, next) => {
						CacheModule.runJob(
							"HGET",
							{
								table: "youtubeApiRequestParams",
								key: apiRequestId.toString()
							},
							this
						)
							.then(apiRequestParams => {
								next(null, {
									...apiRequest._doc,
									params: apiRequestParams
								});
							})
							.catch(err => next(err));
					},

					(apiRequest, next) => {
						CacheModule.runJob(
							"HGET",
							{
								table: "youtubeApiRequestResults",
								key: apiRequestId.toString()
							},
							this
						)
							.then(apiRequestResults => {
								next(null, {
									...apiRequest,
									results: apiRequestResults
								});
							})
							.catch(err => next(err));
					}
				],
				(err, apiRequest) => {
					if (err) reject(new Error(err));
					else resolve({ apiRequest });
				}
			);
		});
	}

	/**
	 * Removed all stored api requests from mongo and redis
	 * 	 @returns {Promise} - returns promise (reject, resolve)
	 */
	RESET_STORED_API_REQUESTS() {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						this.publishProgress({ status: "update", message: `Resetting stored API requests (stage 1)` });
						YouTubeModule.youtubeApiRequestModel.find({}, next);
					},

					(apiRequests, next) => {
						this.publishProgress({ status: "update", message: `Resetting stored API requests (stage 2)` });
						YouTubeModule.youtubeApiRequestModel.deleteMany({}, err => {
							if (err) next("Couldn't reset stored YouTube API requests.");
							else {
								next(null, apiRequests);
							}
						});
					},

					(apiRequests, next) => {
						this.publishProgress({ status: "update", message: `Resetting stored API requests (stage 3)` });
						CacheModule.runJob("DEL", { key: "youtubeApiRequestParams" }, this)
							.then(() => next(null, apiRequests))
							.catch(err => next(err));
					},

					(apiRequests, next) => {
						this.publishProgress({ status: "update", message: `Resetting stored API requests (stage 4)` });
						CacheModule.runJob("DEL", { key: "youtubeApiRequestResults" }, this)
							.then(() => next(null, apiRequests))
							.catch(err => next(err));
					},

					(apiRequests, next) => {
						this.publishProgress({ status: "update", message: `Resetting stored API requests (stage 5)` });
						async.eachLimit(
							apiRequests.map(apiRequest => apiRequest._id),
							1,
							(requestId, next) => {
								CacheModule.runJob(
									"PUB",
									{
										channel: "youtube.removeYoutubeApiRequest",
										value: requestId
									},
									this
								)
									.then(() => {
										next();
									})
									.catch(err => {
										next(err);
									});
							},
							err => {
								if (err) next(err);
								else next();
							}
						);
					}
				],
				err => {
					if (err) reject(new Error(err));
					else resolve();
				}
			);
		});
	}

	/**
	 * Remove a stored api request
	 * @param {object} payload - object that contains the payload
	 * @param {object} payload.requestId - the api request id
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	REMOVE_STORED_API_REQUEST(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						YouTubeModule.youtubeApiRequestModel.deleteOne({ _id: payload.requestId }, err => {
							if (err) next("Couldn't remove stored YouTube API request.");
							else {
								next();
							}
						});
					},

					next => {
						CacheModule.runJob(
							"HDEL",
							{
								table: "youtubeApiRequestParams",
								key: payload.requestId.toString()
							},
							this
						)
							.then(next)
							.catch(err => next(err));
					},

					next => {
						CacheModule.runJob(
							"HDEL",
							{
								table: "youtubeApiRequestResults",
								key: payload.requestId.toString()
							},
							this
						)
							.then(next)
							.catch(err => next(err));
					},

					next => {
						CacheModule.runJob("PUB", {
							channel: "youtube.removeYoutubeApiRequest",
							value: payload.requestId.toString()
						})
							.then(next)
							.catch(err => next(err));
					}
				],
				err => {
					if (err) reject(new Error(err));
					else resolve();
				}
			);
		});
	}

	/**
	 * Create YouTube videos
	 * @param {object} payload - an object containing the payload
	 * @param {Array | object} payload.youtubeVideos - the youtubeVideo object or array of
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	CREATE_VIDEOS(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						let { youtubeVideos } = payload;
						if (typeof youtubeVideos !== "object") next("Invalid youtubeVideos type");
						else {
							if (!Array.isArray(youtubeVideos)) youtubeVideos = [youtubeVideos];
							YouTubeModule.youtubeVideoModel.insertMany(youtubeVideos, next);
						}
					},

					(youtubeVideos, next) => {
						// TODO support spotify here
						const mediaSources = youtubeVideos.map(video => `youtube:${video.youtubeId}`);
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
								else next(null, youtubeVideos);
							}
						);
					}
				],
				(err, youtubeVideos) => {
					if (err) reject(new Error(err));
					else resolve({ youtubeVideos });
				}
			);
		});
	}

	/**
	 * Get YouTube videos
	 * @param {object} payload - an object containing the payload
	 * @param {Array} payload.identifiers - an array of YouTube video ObjectId's or YouTube ID's
	 * @param {boolean} payload.createMissing - attempt to fetch and create video's if not in db
	 * @param {boolean} payload.replaceExisting - replace existing
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_VIDEOS(payload) {
		const getVideosFromYoutubeIds = async youtubeIds => {
			const jobsToRun = [];

			const chunkSize = 50;
			while (youtubeIds.length > 0) {
				const chunkedYoutubeIds = youtubeIds.splice(0, chunkSize);

				const params = {
					part: "snippet,contentDetails,statistics,status",
					id: chunkedYoutubeIds.join(",")
				};

				jobsToRun.push(YouTubeModule.runJob("API_GET_VIDEOS", { params }, this));
			}

			const jobResponses = await Promise.all(jobsToRun);

			return jobResponses
				.map(jobResponse => jobResponse.response.data.items)
				.flat()
				.map(item => {
					// TODO Clean up duration converter
					let dur = item.contentDetails.duration;

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

					dur.replace(/([\d]*)S/, (v, v2) => {
						v2 = Number(v2);
						duration += v2;
						return "";
					});

					const youtubeVideo = {
						youtubeId: item.id,
						title: item.snippet.title,
						author: item.snippet.channelTitle,
						thumbnail: item.snippet.thumbnails.default.url,
						duration,
						uploadedAt: new Date(item.snippet.publishedAt),
						rawData: item
					};

					return youtubeVideo;
				});
		};

		const { identifiers, createMissing, replaceExisting } = payload;

		const youtubeIds = identifiers.filter(identifier => !mongoose.Types.ObjectId.isValid(identifier));
		const objectIds = identifiers.filter(identifier => mongoose.Types.ObjectId.isValid(identifier));

		const existingVideos = (await YouTubeModule.youtubeVideoModel.find({ youtubeId: youtubeIds }))
			.concat(await YouTubeModule.youtubeVideoModel.find({ _id: objectIds }))
			.map(video => video._doc);

		const existingYoutubeIds = existingVideos.map(existingVideo => existingVideo.youtubeId);
		// const existingYoutubeObjectIds = existingVideos.map(existingVideo => existingVideo._id.toString());

		if (!replaceExisting) {
			if (!createMissing) return { videos: existingVideos };
			if (identifiers.length === existingVideos.length || youtubeIds.length === 0)
				return { videos: existingVideos };

			const missingYoutubeIds = youtubeIds.filter(youtubeId => existingYoutubeIds.indexOf(youtubeId) === -1);

			if (missingYoutubeIds.length === 0) return { videos: existingVideos };

			const newVideos = await getVideosFromYoutubeIds(missingYoutubeIds);

			await YouTubeModule.runJob("CREATE_VIDEOS", { youtubeVideos: newVideos }, this);

			return { videos: existingVideos.concat(newVideos) };
		}

		const newVideos = await getVideosFromYoutubeIds(existingYoutubeIds);

		const promises = newVideos.map(newVideo =>
			YouTubeModule.youtubeVideoModel.updateOne(
				{ youtubeId: newVideo.youtubeId },
				{ $set: { ...newVideo, updatedAt: Date.now(), documentVersion: 2 } }
			)
		);

		await Promise.allSettled(promises);

		return { videos: newVideos };
	}

	/**
	 * Get YouTube channels
	 * @param {object} payload - an object containing the payload
	 * @param {Array} payload.channelIds - an array of YouTube channel id's
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_CHANNELS_FROM_IDS(payload) {
		const getChannels = async channelIds => {
			const jobsToRun = [];

			const chunkSize = 50;
			while (channelIds.length > 0) {
				const chunkedChannelIds = channelIds.splice(0, chunkSize);

				const params = {
					part: [
						"brandingSettings",
						"contentDetails",
						"contentOwnerDetails",
						"id",
						"localizations",
						"snippet",
						"statistics",
						"status",
						"topicDetails"
					].join(","),
					id: chunkedChannelIds.join(",")
				};

				jobsToRun.push(YouTubeModule.runJob("API_GET_CHANNELS", { params }, this));
			}

			const jobResponses = await Promise.all(jobsToRun);

			return jobResponses
				.map(jobResponse => jobResponse.response.data.items)
				.flat()
				.map(item => {
					const youtubeChannel = {
						channelId: item.id,
						title: item.snippet.title,
						customUrl: item.snippet.customUrl,
						rawData: item
					};

					return youtubeChannel;
				});
		};

		const { channelIds } = payload;

		const existingChannels = (await YouTubeModule.youtubeChannelModel.find({ channelId: channelIds })).map(
			channel => channel._doc
		);

		const existingChannelIds = existingChannels.map(existingChannel => existingChannel.channelId);
		// const existingChannelObjectIds = existingChannels.map(existingChannel => existingChannel._id.toString());

		if (channelIds.length === existingChannels.length) return { channels: existingChannels };

		const missingChannelIds = channelIds.filter(channelId => existingChannelIds.indexOf(channelId) === -1);

		if (missingChannelIds.length === 0) return { videos: existingChannels };

		const newChannels = await getChannels(missingChannelIds);

		await YouTubeModule.youtubeChannelModel.insertMany(newChannels);

		return { channels: existingChannels.concat(newChannels) };
	}

	/**
	 * Remove YouTube videos
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.videoIds - Array of youtubeVideo ObjectIds
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE_VIDEOS(payload) {
		return new Promise((resolve, reject) => {
			let { videoIds } = payload;
			if (!Array.isArray(videoIds)) videoIds = [videoIds];

			async.waterfall(
				[
					next => {
						if (!videoIds.every(videoId => mongoose.Types.ObjectId.isValid(videoId)))
							next("One or more videoIds are not a valid ObjectId.");
						else {
							this.publishProgress({ status: "update", message: `Removing video (stage 1)` });
							YouTubeModule.youtubeVideoModel.find({ _id: { $in: videoIds } }, (err, videos) => {
								if (err) next(err);
								else
									next(
										null,
										videos.map(video => video.youtubeId)
									);
							});
						}
					},

					(youtubeIds, next) => {
						this.publishProgress({ status: "update", message: `Removing video (stage 2)` });
						SongsModule.SongModel.find({ youtubeId: { $in: youtubeIds } }, (err, songs) => {
							if (err) next(err);
							else {
								const filteredIds = youtubeIds.filter(
									youtubeId => !songs.find(song => song.youtubeId === youtubeId)
								);
								if (filteredIds.length < youtubeIds.length)
									next("One or more videos are attached to songs.");
								else next(null, filteredIds);
							}
						});
					},

					(youtubeIds, next) => {
						this.publishProgress({ status: "update", message: `Removing video (stage 3)` });
						MediaModule.runJob("REMOVE_RATINGS", { youtubeIds }, this)
							.then(() => next(null, youtubeIds))
							.catch(next);
					},

					(youtubeIds, next) => {
						this.publishProgress({ status: "update", message: `Removing video (stage 4)` });
						async.eachLimit(
							youtubeIds,
							2,
							(youtubeId, next) => {
								async.waterfall(
									[
										next => {
											PlaylistsModule.playlistModel.find(
												{ "songs.youtubeId": youtubeId },
												(err, playlists) => {
													if (err) next(err);
													else {
														async.eachLimit(
															playlists,
															1,
															(playlist, next) => {
																PlaylistsModule.runJob(
																	"REMOVE_FROM_PLAYLIST",
																	{ playlistId: playlist._id, youtubeId },
																	this
																)
																	.then(() => next())
																	.catch(next);
															},
															next
														);
													}
												}
											);
										},

										next => {
											StationsModule.stationModel.find(
												{ "queue.youtubeId": youtubeId },
												(err, stations) => {
													if (err) next(err);
													else {
														async.eachLimit(
															stations,
															1,
															(station, next) => {
																StationsModule.runJob(
																	"REMOVE_FROM_QUEUE",
																	{ stationId: station._id, youtubeId },
																	this
																)
																	.then(() => next())
																	.catch(err => {
																		if (
																			err === "Station not found" ||
																			err ===
																				"Song is not currently in the queue."
																		)
																			next();
																		else next(err);
																	});
															},
															next
														);
													}
												}
											);
										},

										next => {
											StationsModule.stationModel.find(
												{ "currentSong.youtubeId": youtubeId },
												(err, stations) => {
													if (err) next(err);
													else {
														async.eachLimit(
															stations,
															1,
															(station, next) => {
																StationsModule.runJob(
																	"SKIP_STATION",
																	{
																		stationId: station._id,
																		natural: false,
																		skipReason: "other"
																	},
																	this
																)
																	.then(() => {
																		next();
																	})
																	.catch(err => {
																		if (err.message === "Station not found.")
																			next();
																		else next(err);
																	});
															},
															next
														);
													}
												}
											);
										}
									],
									next
								);
							},
							next
						);
					},

					next => {
						this.publishProgress({ status: "update", message: `Removing video (stage 5)` });
						YouTubeModule.youtubeVideoModel.deleteMany({ _id: { $in: videoIds } }, next);
					},

					(res, next) => {
						this.publishProgress({ status: "update", message: `Removing video (stage 6)` });
						CacheModule.runJob("PUB", {
							channel: "youtube.removeVideos",
							value: videoIds
						})
							.then(next)
							.catch(err => next(err));
					}
				],
				err => {
					if (err) reject(new Error(err));
					else resolve();
				}
			);
		});
	}

	/**
	 * Request a set of YouTube videos
	 * @param {object} payload - an object containing the payload
	 * @param {string} payload.url - the url of the the YouTube playlist or channel
	 * @param {boolean} payload.musicOnly - whether to only get music from the playlist/channel
	 * @param {boolean} payload.returnVideos - whether to return videos
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REQUEST_SET(payload) {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					next => {
						const playlistRegex = /[\\?&]list=([^&#]*)/;
						const channelRegex =
							/\.[\w]+\/(?:(?:channel\/(UC[0-9A-Za-z_-]{21}[AQgw]))|(?:user\/?([\w-]+))|(?:c\/?([\w-]+))|(?:\/?([\w-]+)))/;
						if (playlistRegex.exec(payload.url) || channelRegex.exec(payload.url))
							YouTubeModule.runJob(
								playlistRegex.exec(payload.url) ? "GET_PLAYLIST" : "GET_CHANNEL_VIDEOS",
								{
									url: payload.url,
									musicOnly: payload.musicOnly
								},
								this
							)
								.then(res => {
									next(null, res.songs);
								})
								.catch(next);
						else next("Invalid YouTube URL.");
					},

					async youtubeIds => {
						if (youtubeIds.length === 0) return { videos: [] };

						const { videos } = await YouTubeModule.runJob(
							"GET_VIDEOS",
							{ identifiers: youtubeIds, createMissing: true },
							this
						);

						return { videos };
					}
				],
				(err, response) => {
					if (err) reject(new Error(err));
					else resolve(response);
				}
			);
		});
	}

	/**
	 * Gets missing YouTube video's from all playlists, stations and songs
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_MISSING_VIDEOS() {
		const youtubeIds = Array.from(
			new Set(
				[
					...(await SongsModule.runJob("GET_ALL_MEDIA_SOURCES", {}, this)),
					...(await PlaylistsModule.runJob("GET_ALL_MEDIA_SOURCES", {}, this))
				]
					.filter(mediaSource => mediaSource.startsWith("youtube:"))
					.map(mediaSource => mediaSource.split(":")[1])
			)
		);

		const existingYoutubeIds = await YouTubeModule.youtubeVideoModel.distinct("youtubeId");

		const missingYoutubeIds = youtubeIds.filter(youtubeId => existingYoutubeIds.indexOf(youtubeId) === -1);

		const res = await YouTubeModule.runJob(
			"GET_VIDEOS",
			{ identifiers: missingYoutubeIds, createMissing: true },
			this
		);

		const gotVideos = res.videos;

		return {
			all: youtubeIds.length,
			existing: existingYoutubeIds.length,
			missing: missingYoutubeIds.length,
			got: gotVideos.length
		};
	}

	/**
	 * Updates videos from version 1 to version 2
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async UPDATE_VIDEOS_V1_TO_V2() {
		const videoIds = await YouTubeModule.youtubeVideoModel.distinct("_id", { documentVersion: 1 });

		const res = await YouTubeModule.runJob("GET_VIDEOS", { identifiers: videoIds, replaceExisting: true }, this);

		const v1 = videoIds.length;
		const v2 = res.videos.length;

		return {
			v1,
			v2
		};
	}

	/**
	 * Gets missing YouTube channels based on cached YouTube video's
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	async GET_MISSING_CHANNELS() {
		const currentChannelIds = await YouTubeModule.youtubeChannelModel.distinct("channelId");
		const videoChannelIds = await YouTubeModule.youtubeVideoModel.distinct("rawData.snippet.channelId");

		const missingChannelIds = videoChannelIds.filter(channelId => currentChannelIds.indexOf(channelId) === -1);

		const res = await YouTubeModule.runJob("GET_CHANNELS_FROM_IDS", { channelIds: missingChannelIds }, this);

		const gotChannels = res.channels;

		return {
			current: currentChannelIds.length,
			all: videoChannelIds.length,
			missing: missingChannelIds.length,
			got: gotChannels.length
		};
	}
}

export default new _YouTubeModule();
