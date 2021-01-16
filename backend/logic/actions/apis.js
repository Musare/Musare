import config from "config";
import async from "async";
import request from "request";

import { isAdminRequired } from "./hooks";

import moduleManager from "../../index";

const UtilsModule = moduleManager.modules.utils;
const IOModule = moduleManager.modules.io;

export default {
	/**
	 * Fetches a list of songs from Youtubes API
	 *
	 * @param {object} session - user session
	 * @param {string} query - the query we'll pass to youtubes api
	 * @param {Function} cb - callback
	 * @returns {{status: string, data: object}} - returns an object
	 */
	searchYoutube(session, query, cb) {
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
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"APIS_SEARCH_YOUTUBE",
						`Searching youtube failed with query "${query}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log("SUCCESS", "APIS_SEARCH_YOUTUBE", `Searching YouTube successful with query "${query}".`);
				return cb({ status: "success", data });
			}
		);
	},

	/**
	 * Gets Discogs data
	 *
	 * @param session
	 * @param query - the query
	 * @param {Function} cb
	 */
	searchDiscogs: isAdminRequired(function searchDiscogs(session, query, page, cb) {
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
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"APIS_SEARCH_DISCOGS",
						`Searching discogs failed with query "${query}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
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
	joinRoom(session, page, cb) {
		if (page === "home") {
			IOModule.runJob("SOCKET_JOIN_ROOM", {
				socketId: session.socketId,
				room: page
			})
				.then()
				.catch(err => {
					this.log("ERROR", `Joining room failed: ${err.message}`);
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
			IOModule.runJob("SOCKET_JOIN_ROOM", {
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
	ping(session, cb) {
		cb({ date: Date.now() });
	}
};
