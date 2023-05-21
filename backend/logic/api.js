import config from "config";

import async from "async";
import crypto from "crypto";

import CoreClass from "../core";

import { hasPermission } from "./hooks/hasPermission";

let AppModule;
let DBModule;
let PlaylistsModule;
let UtilsModule;
let PunishmentsModule;
let CacheModule;
let NotificationsModule;

class _APIModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("api");
	}

	/**
	 * Initialises the api module
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			AppModule = this.moduleManager.modules.app;
			DBModule = this.moduleManager.modules.db;
			PlaylistsModule = this.moduleManager.modules.playlists;
			UtilsModule = this.moduleManager.modules.utils;
			PunishmentsModule = this.moduleManager.modules.punishments;
			CacheModule = this.moduleManager.modules.cache;
			NotificationsModule = this.moduleManager.modules.notifications;

			const SIDname = config.get("cookie");

			const isLoggedIn = (req, res, next) => {
				let SID;
				async.waterfall(
					[
						next => {
							UtilsModule.runJob("PARSE_COOKIES", {
								cookieString: req.headers.cookie
							})
								.then(res => {
									SID = res[SIDname];
									next(null);
								})
								.catch(next);
						},

						next => {
							if (!SID) return next("No SID.");
							return next();
						},

						next => {
							CacheModule.runJob("HGET", { table: "sessions", key: SID }).then(session =>
								next(null, session)
							);
						},

						(session, next) => {
							if (!session) return next("No session found.");

							session.refreshDate = Date.now();

							req.session = session;

							return CacheModule.runJob("HSET", {
								table: "sessions",
								key: SID,
								value: session
							}).then(session => {
								next(null, session);
							});
						},

						(res, next) => {
							// check if a session's user / IP is banned
							PunishmentsModule.runJob("GET_PUNISHMENTS", {})
								.then(punishments => {
									const isLoggedIn = !!(req.session && req.session.refreshDate);
									const userId = isLoggedIn ? req.session.userId : null;

									const banishment = { banned: false, ban: 0 };

									punishments.forEach(punishment => {
										if (punishment.expiresAt > banishment.ban) banishment.ban = punishment;
										if (
											punishment.type === "banUserId" &&
											isLoggedIn &&
											punishment.value === userId
										)
											banishment.banned = true;
										if (punishment.type === "banUserIp" && punishment.value === req.ip)
											banishment.banned = true;
									});

									req.banishment = banishment;

									next();
								})
								.catch(() => {
									next();
								});
						}
					],
					err => {
						if (err) return res.json({ status: "error", message: "You are not logged in" });
						return next();
					}
				);
			};

			AppModule.runJob("GET_APP", {})
				.then(response => {
					response.app.get("/", (req, res) => {
						res.json({
							status: "success",
							message: "Coming Soon"
						});
					});

					response.app.get("/export/playlist/:playlistId", async (req, res) => {
						const { playlistId } = req.params;

						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId })
							.then(playlist => {
								if (!playlist) res.json({ status: "error", message: "Playlist not found." });
								else if (playlist.privacy === "public") res.json({ status: "success", playlist });
								else
									isLoggedIn(req, res, () => {
										if (playlist.createdBy === req.session.userId)
											res.json({ status: "success", playlist });
										else
											hasPermission("playlists.get", req.session.userId)
												.then(() => res.json({ status: "success", playlist }))
												.catch(() =>
													res.json({
														status: "error",
														message: "You're not allowed to download this playlist."
													})
												);
									});
							})
							.catch(err => {
								res.json({ status: "error", message: err.message });
							});
					});

					if (config.get("debug.stationIssue")) {
						response.app.get("/debug_station", async (req, res) => {
							const responseObject = {};

							const stationModel = await DBModule.runJob("GET_MODEL", {
								modelName: "station"
							});

							async.waterfall(
								[
									next => {
										stationModel.find({}, next);
									},

									(stations, next) => {
										responseObject.mongo = {
											stations
										};
										next();
									},

									next => {
										CacheModule.runJob("HGETALL", { table: "stations" })
											.then(stations => {
												next(null, stations);
											})
											.catch(err => {
												console.log(err);
												next(err);
											});
									},

									(stations, next) => {
										responseObject.redis = {
											stations
										};
										next();
									},

									next => {
										responseObject.cryptoExamples = {};
										responseObject.mongo.stations.forEach(station => {
											const payloadName = `stations.nextSong?id=${station._id}`;
											responseObject.cryptoExamples[station._id] = crypto
												.createHash("md5")
												.update(`_notification:${payloadName}_`)
												.digest("hex");
										});
										next();
									},

									next => {
										NotificationsModule.pub
											.KEYS("*")
											.then(redisKeys => next(null, redisKeys))
											.catch(next);
									},

									(redisKeys, next) => {
										responseObject.redis = {
											...redisKeys,
											ttl: {}
										};
										async.eachLimit(
											redisKeys,
											1,
											(redisKey, next) => {
												NotificationsModule.pub
													.TTL(redisKey)
													.then(ttl => {
														responseObject.redis.ttl[redisKey] = ttl;
														next();
													})
													.catch(next);
											},
											next
										);
									},

									next => {
										responseObject.debugLogs = this.moduleManager.debugLogs.stationIssue;
										next();
									},

									next => {
										responseObject.debugJobs = this.moduleManager.debugJobs;
										next();
									}
								],
								err => {
									if (err) {
										console.log(err);
										return res.json({
											error: err,
											objectSoFar: responseObject
										});
									}

									const responseJson = JSON.stringify(responseObject, (key, value) => {
										if (
											key === "module" ||
											key === "task" ||
											key === "onFinish" ||
											key === "server" ||
											key === "nsp" ||
											key === "socket" ||
											key === "res" ||
											key === "client" ||
											key === "_idleNext" ||
											key === "_idlePrev"
										) {
											return undefined;
										}
										if (key === "parentJob" && value) return value.toString();
										return value;
									});

									return res.end(responseJson);
								}
							);
						});
					}

					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}
}

export default new _APIModule();
