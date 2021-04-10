import async from "async";
import config from "config";

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
		return new Promise(resolve => {
			this.rateLimiter = new RateLimitter(config.get("apis.youtube.rateLimit"));
			this.requestTimeout = config.get("apis.youtube.requestTimeout");

			resolve();
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
			key: config.get("apis.youtube.key"),
			type: "video",
			maxResults: 10
		};

		if (payload.pageToken) params.pageToken = payload.pageToken;

		return new Promise((resolve, reject) =>
			YouTubeModule.rateLimiter.continue().then(() => {
				YouTubeModule.rateLimiter.restart();
				axios
					.get("https://www.googleapis.com/youtube/v3/search", { params })
					.then(res => {
						if (res.data.err) {
							YouTubeModule.log("ERROR", "SEARCH", `${res.data.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						return resolve(res.data);
					})
					.catch(err => {
						YouTubeModule.log("ERROR", "SEARCH", `${err.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					});
			})
		);
	}

	/**
	 * Gets the details of a song using the YouTube API
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.songId - the YouTube API id of the song
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SONG(payload) {
		return new Promise((resolve, reject) => {
			const params = {
				part: "snippet,contentDetails,statistics,status",
				id: payload.songId,
				key: config.get("apis.youtube.key")
			};

			if (payload.pageToken) params.pageToken = payload.pageToken;

			YouTubeModule.rateLimiter.continue().then(() => {
				YouTubeModule.rateLimiter.restart();
				axios
					.get("https://www.googleapis.com/youtube/v3/videos", {
						params,
						timeout: YouTubeModule.requestTimeout
					})
					.then(res => {
						if (res.data.error) {
							YouTubeModule.log("ERROR", "GET_SONG", `${res.data.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						if (res.data.items[0] === undefined)
							return reject(
								new Error("The specified video does not exist or cannot be publicly accessed.")
							);

						// TODO Clean up duration converter
						let dur = res.data.items[0].contentDetails.duration;

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
							songId: res.data.items[0].id,
							title: res.data.items[0].snippet.title,
							thumbnail: res.data.items[0].snippet.thumbnails.default.url,
							duration
						};

						return resolve({ song });
					})
					.catch(err => {
						YouTubeModule.log("ERROR", "GET_SONG", `${err.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					});
			});
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
			const regex = new RegExp(`[\\?&]list=([^&#]*)`);
			const splitQuery = regex.exec(payload.url);

			if (!splitQuery) {
				YouTubeModule.log("ERROR", "GET_PLAYLIST", "Invalid YouTube playlist URL query.");
				return reject(new Error("Invalid playlist URL."));
			}
			const playlistId = splitQuery[1];

			return async.waterfall(
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
						resolve({ songs: response.filteredSongs ? response.filteredSongs.songIds : response.songs });
					}
				}
			);
		});
	}

	/**
	 * Returns a a page from a YouTube playlist. Is used internally by GET_PLAYLIST.
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
				key: config.get("apis.youtube.key"),
				maxResults: 50
			};

			if (payload.nextPageToken) params.pageToken = payload.nextPageToken;

			YouTubeModule.rateLimiter.continue().then(() => {
				YouTubeModule.rateLimiter.restart();
				axios
					.get("https://www.googleapis.com/youtube/v3/playlistItems", {
						params,
						timeout: YouTubeModule.requestTimeout
					})
					.then(res => {
						if (res.data.err) {
							YouTubeModule.log("ERROR", "GET_PLAYLIST_PAGE", `${res.data.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						const songs = res.data.items;

						if (res.data.nextPageToken) return resolve({ nextPageToken: res.data.nextPageToken, songs });

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
				return resolve({ videoIds: [] });
			}

			const params = {
				part: "topicDetails",
				id: localVideoIds.join(","),
				key: config.get("apis.youtube.key"),
				maxResults: videosPerPage
			};

			return YouTubeModule.rateLimiter.continue().then(() => {
				YouTubeModule.rateLimiter.restart();
				axios
					.get("https://www.googleapis.com/youtube/v3/videos", {
						params,
						timeout: YouTubeModule.requestTimeout
					})
					.then(res => {
						if (res.data.err) {
							YouTubeModule.log("ERROR", "FILTER_MUSIC_VIDEOS", `${res.data.error.message}`);
							return reject(new Error("An error has occured. Please try again later."));
						}

						const songIds = [];

						res.data.items.forEach(item => {
							const songId = item.id;

							if (!item.topicDetails) return;
							if (item.topicDetails.topicCategories.indexOf("https://en.wikipedia.org/wiki/Music") !== -1)
								songIds.push(songId);
						});

						return YouTubeModule.runJob(
							"FILTER_MUSIC_VIDEOS",
							{ videoIds: payload.videoIds, page: page + 1 },
							this
						)
							.then(result => resolve({ songIds: songIds.concat(result.songIds) }))
							.catch(err => reject(err));
					})
					.catch(err => {
						YouTubeModule.log("ERROR", "FILTER_MUSIC_VIDEOS", `${err.message}`);
						return reject(new Error("Failed to find playlist from YouTube"));
					});
			});
		});
	}
}

export default new _YouTubeModule();
