import config from "config";

import async from "async";

import request from "request";
import { isAdminRequired } from "./hooks";
// const moduleManager = require("../../index");

import utils from "../utils";

// const logger = moduleManager.modules["logger"];

export default {
	/**
	 * Fetches a list of songs from Youtubes API
	 *
	 * @param {object} session - user session
	 * @param {string} query - the query we'll pass to youtubes api
	 * @param {Function} cb - callback
	 * @returns {{status: string, data: object}} - returns an object
	 */
	searchYoutube: (session, query, cb) => {
		const params = [
			"part=snippet",
			`q=${encodeURIComponent(query)}`,
			`key=${config.get("apis.youtube.key")}`,
			"type=video",
			"maxResults=15"
		].join("&");

		return async.waterfall(
			[
				next => {
					request(`https://www.googleapis.com/youtube/v3/search?${params}`, next);
				},

				(res, body, next) => {
					next(null, JSON.parse(body));
				}
			],
			async (err, data) => {
				console.log(data.error);
				if (err || data.error) {
					if (!err) err = data.error.message;
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log(
						"ERROR",
						"APIS_SEARCH_YOUTUBE",
						`Searching youtube failed with query "${query}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				console.log("SUCCESS", "APIS_SEARCH_YOUTUBE", `Searching YouTube successful with query "${query}".`);
				return cb({ status: "success", data });
			}
		);
	},

	/**
	 * Gets Spotify data
	 *
	 * @param session
	 * @param title - the title of the song
	 * @param artist - an artist for that song
	 * @param cb
	 */
	getSpotifySongs: isAdminRequired((session, title, artist, cb) => {
		async.waterfall(
			[
				next => {
					utils
						.runJob("GET_SONGS_FROM_SPOTIFY", { title, artist })
						.then(songs => {
							next(null, songs);
						})
						.catch(next);
				}
			],
			songs => {
				console.log(
					"SUCCESS",
					"APIS_GET_SPOTIFY_SONGS",
					`User "${session.userId}" got Spotify songs for title "${title}" successfully.`
				);
				cb({ status: "success", songs });
			}
		);
	}),

	/**
	 * Gets Discogs data
	 *
	 * @param session
	 * @param query - the query
	 * @param {Function} cb
	 */
	searchDiscogs: isAdminRequired((session, query, page, cb) => {
		async.waterfall(
			[
				next => {
					const params = [`q=${encodeURIComponent(query)}`, `per_page=20`, `page=${page}`].join("&");

					const options = {
						url: `https://api.discogs.com/database/search?${params}`,
						headers: {
							"User-Agent": "Request",
							Authorization: `Discogs key=${config.get("apis.discogs.client")}, secret=${config.get(
								"apis.discogs.secret"
							)}`
						}
					};

					request(options, (err, res, body) => {
						if (err) next(err);
						body = JSON.parse(body);
						next(null, body);
						if (body.error) next(body.error);
					});
				}
			],
			async (err, body) => {
				if (err) {
					err = await utils.runJob("GET_ERROR", { error: err });
					console.log(
						"ERROR",
						"APIS_SEARCH_DISCOGS",
						`Searching discogs failed with query "${query}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				console.log(
					"SUCCESS",
					"APIS_SEARCH_DISCOGS",
					`User "${session.userId}" searched Discogs succesfully for query "${query}".`
				);
				return cb({
					status: "success",
					results: body.results,
					pages: body.pagination.pages
				});
			}
		);
	}),

	/**
	 * Joins a room
	 *
	 * @param {object} session - user session
	 * @param {string} page - the room to join
	 * @param {Function} cb - callback
	 */
	joinRoom: (session, page, cb) => {
		if (page === "home") {
			utils.runJob("SOCKET_JOIN_ROOM", {
				socketId: session.socketId,
				room: page
			});
		}
		cb({});
	},

	/**
	 * Joins an admin room
	 *
	 * @param {object} session - user session
	 * @param {string} page - the admin room to join
	 * @param {Function} cb - callback
	 */
	joinAdminRoom: isAdminRequired((session, page, cb) => {
		if (
			page === "queue" ||
			page === "songs" ||
			page === "stations" ||
			page === "reports" ||
			page === "news" ||
			page === "users" ||
			page === "statistics" ||
			page === "punishments"
		) {
			utils.runJob("SOCKET_JOIN_ROOM", {
				socketId: session.socketId,
				room: `admin.${page}`
			});
		}
		cb({});
	}),

	/**
	 * Returns current date
	 *
	 * @param {object} session - user session
	 * @param {Function} cb - callback
	 */
	ping: (session, cb) => {
		cb({ date: Date.now() });
	}
};
