import config from "config";

import async from "async";

import CoreClass from "../core";

class APIModule extends CoreClass {
	constructor() {
		super("api");
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.app = this.moduleManager.modules.app;
			this.stations = this.moduleManager.modules.stations;
			this.db = this.moduleManager.modules.db;
			this.playlists = this.moduleManager.modules.playlists;
			this.utils = this.moduleManager.modules.utils;
			this.punishments = this.moduleManager.modules.punishments;
			this.cache = this.moduleManager.modules.cache;
			this.notifications = this.moduleManager.modules.notifications;

			const SIDname = config.get("cookie.SIDname");

			const isLoggedIn = (req, res, next) => {
				let SID;
				async.waterfall(
					[
						next => {
							this.utils
								.runJob("PARSE_COOKIES", {
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
							this.cache
								.runJob("HGET", { table: "sessions", key: SID })
								.then(session => next(null, session));
						},

						(session, next) => {
							if (!session) return next("No session found.");

							session.refreshDate = Date.now();

							req.session = session;

							return this.cache
								.runJob("HSET", {
									table: "sessions",
									key: SID,
									value: session
								})
								.then(session => {
									next(null, session);
								});
						},

						(res, next) => {
							// check if a session's user / IP is banned
							this.punishments
								.runJob("GET_PUNISHMENTS", {})
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

			this.app
				.runJob("GET_APP", {})
				.then(response => {
					response.app.get("/", (req, res) => {
						res.json({
							status: "success",
							message: "Coming Soon"
						});
					});

					response.app.get("/export/privatePlaylist/:playlistId", isLoggedIn, (req, res) => {
						const { playlistId } = req.params;
						this.playlists
							.runJob("GET_PLAYLIST", { playlistId })
							.then(playlist => {
								if (playlist.createdBy === req.session.userId)
									res.json({ status: "success", playlist });
								else res.json({ status: "error", message: "You're not the owner." });
							})
							.catch(err => {
								res.json({ status: "error", message: err.message });
							});
					});

					// response.app.get("/debug_station", async (req, res) => {
					//     const responseObject = {};

					//     const stationModel = await this.db.runJob(
					//         "GET_MODEL",
					//         {
					//             modelName: "station",
					//         }
					//     );

					//     async.waterfall([
					//         next => {
					//             stationModel.find({}, next);
					//         },

					//         (stations, next) => {
					//             responseObject.mongo = {
					//                 stations
					//             };
					//             next();
					//         },

					//         next => {
					//             this.cache
					//                 .runJob("HGETALL", { table: "stations" })
					//                 .then(stations => {
					//                     next(null, stations);
					//                 })
					//                 .catch(next);
					//         },

					//         (stations, next) => {
					//             responseObject.redis = {
					//                 stations
					//             };
					//             next();
					//         },

					//         next => {
					//             responseObject.cryptoExamples = {};
					//             responseObject.mongo.stations.forEach(station => {
					//                 const payloadName = `stations.nextSong?id=${station._id}`;
					//                 responseObject.cryptoExamples[station._id] = crypto
					//                     .createHash("md5")
					//                     .update(`_notification:${payloadName}_`)
					//                     .digest("hex")
					//             });
					//             next();
					//         },

					//         next => {
					//             this.notifications.pub.keys("*", next);
					//         },

					//         (redisKeys, next) => {
					//             responseObject.redis = {
					//                 ...redisKeys,
					//                 ttl: {}
					//             };
					//             async.eachLimit(redisKeys, 1, (redisKey, next) => {
					//                 this.notifications.pub.ttl(redisKey, (err, ttl) => {
					//                     responseObject.redis.ttl[redisKey] = ttl;
					//                     next(err);
					//                 })
					//             }, next);
					//         },

					//         next => {
					//             responseObject.debugLogs = this.moduleManager.debugLogs.stationIssue;
					//             next();
					//         },

					//         next => {
					//             responseObject.debugJobs = this.moduleManager.debugJobs;
					//             next();
					//         }
					//     ], (err, response) => {
					//         if (err) {
					//             console.log(err);
					//             return res.json({
					//                 error: err,
					//                 objectSoFar: responseObject
					//             });
					//         }

					//         res.json(responseObject);
					//     });
					// });

					// Object.keys(actions).forEach(namespace => {
					//     Object.keys(actions[namespace]).forEach(action => {
					//         let name = `/${namespace}/${action}`;

					//         response.app.get(name, (req, res) => {
					//             actions[namespace][action](null, result => {
					//                 if (typeof cb === "function")
					//                     return res.json(result);
					//             });
					//         });
					//     });
					// });

					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}
}

export default new APIModule();
