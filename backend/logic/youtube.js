import async from "async";
import config from "config";

import request from "request";

import CoreClass from "../core";

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
			resolve();
		});
	}

	/**
	 * Gets the details of a song using the YouTube API
	 *
	 * @param {object} payload - object that contains the payload
	 * @param {string} payload.songId - the YouTube API id of the song
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SONG(payload) {
		// songId, cb
		return new Promise((resolve, reject) => {
			const youtubeParams = [
				"part=snippet,contentDetails,statistics,status",
				`id=${encodeURIComponent(payload.songId)}`,
				`key=${config.get("apis.youtube.key")}`
			].join("&");

			request(
				{
					url: `https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`,
					timeout: 30000,
					agent: false,
					pool: { maxSockets: 100 }
				},
				(err, res, body) => {
					if (err) {
						YouTubeModule.log("ERROR", "GET_SONG", `${err.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					body = JSON.parse(body);

					if (body.error) {
						YouTubeModule.log("ERROR", "GET_SONG", `${body.error.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					if (body.items[0] === undefined)
						return reject(new Error("The specified video does not exist or cannot be publicly accessed."));

					// TODO Clean up duration converter
					let dur = body.items[0].contentDetails.duration;

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
						songId: body.items[0].id,
						title: body.items[0].snippet.title,
						thumbnail: body.items[0].snippet.thumbnails.default.url,
						duration
					};

					return resolve({ song });
				}
			);
			// songId: payload.songId
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
		// payload includes: url, musicOnly
		return new Promise((resolve, reject) => {
			const name = "list".replace(/[\\[]/, "\\[").replace(/[\]]/, "\\]");

			const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
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
										// eslint-disable-next-line no-loop-func
										.then(response => {
											songs = songs.concat(response.songs);
											nextPageToken = response.nextPageToken;
											next();
										})
										// eslint-disable-next-line no-loop-func
										.catch(err => {
											next(err);
										});
								}, 250);
							},
							err => {
								next(err, songs);
							}
						);
					},

					(songs, next) => {
						next(
							null,
							songs.map(song => song.contentDetails.videoId)
						);
					},

					(songs, next) => {
						if (!payload.musicOnly) return next(true, { songs });
						return YouTubeModule.runJob(
							"FILTER_MUSIC_VIDEOS",
							{
								videoIds: songs.slice()
							},
							this
						)
							.then(filteredSongs => {
								next(null, { filteredSongs, songs });
							})
							.catch(next);
					}
				],
				(err, response) => {
					if (err && err !== true) {
						YouTubeModule.log("ERROR", "GET_PLAYLIST", "Some error has occurred.", err.message);
						reject(new Error("Some error has occurred."));
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
		// payload includes: playlistId, nextPageToken
		return new Promise((resolve, reject) => {
			const nextPageToken = payload.nextPageToken ? `pageToken=${payload.nextPageToken}` : "";
			const videosPerPage = 50;
			const youtubeParams = [
				"part=contentDetails",
				`playlistId=${encodeURIComponent(payload.playlistId)}`,
				`maxResults=${videosPerPage}`,
				`key=${config.get("apis.youtube.key")}`,
				nextPageToken
			].join("&");

			request(
				{
					url: `https://www.googleapis.com/youtube/v3/playlistItems?${youtubeParams}`,
					timeout: 30000,
					agent: false,
					pool: { maxSockets: 100 }
				},
				async (err, res, body) => {
					if (err) {
						YouTubeModule.log("ERROR", "GET_PLAYLIST_PAGE", `${err.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					body = JSON.parse(body);

					if (body.error) {
						YouTubeModule.log("ERROR", "GET_PLAYLIST_PAGE", `${body.error.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					const songs = body.items;

					if (body.nextPageToken) return resolve({ nextPageToken: body.nextPageToken, songs });
					return resolve({ songs });
				}
			);
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
			const videosPerPage = 50; // 50 is the max I believe
			const localVideoIds = payload.videoIds.splice(page * 50, videosPerPage);

			if (localVideoIds.length === 0) {
				return resolve({ videoIds: [] });
			}

			const youtubeParams = [
				"part=topicDetails",
				`id=${encodeURIComponent(localVideoIds.join(","))}`,
				`maxResults=${videosPerPage}`,
				`key=${config.get("apis.youtube.key")}`
			].join("&");

			return request(
				{
					url: `https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`,
					timeout: 30000,
					agent: false,
					pool: { maxSockets: 100 }
				},
				(err, res, body) => {
					if (err) {
						YouTubeModule.log("ERROR", "FILTER_MUSIC_VIDEOS", `${err.message}`);
						return reject(new Error("Failed to find playlist from YouTube"));
					}

					body = JSON.parse(body);

					if (body.error) {
						YouTubeModule.log("ERROR", "FILTER_MUSIC_VIDEOS", `${body.error.message}`);
						return reject(new Error("An error has occured. Please try again later."));
					}

					const songIds = [];
					body.items.forEach(item => {
						const songId = item.id;
						if (!item.topicDetails) return;
						if (item.topicDetails.relevantTopicIds.indexOf("/m/04rlf") !== -1) {
							songIds.push(songId);
						}
					});

					return YouTubeModule.runJob(
						"FILTER_MUSIC_VIDEOS",
						{ videoIds: payload.videoIds, page: page + 1 },
						this
					)
						.then(result => {
							resolve({ songIds: songIds.concat(result.songIds) });
						})
						.catch(err => {
							reject(err);
						});
				}
			);
		});
	}
}

export default new _YouTubeModule();
