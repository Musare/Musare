import config from "config";

import async from "async";

import CoreClass from "../core";

let AppModule;
let PlaylistsModule;
let UtilsModule;
let PunishmentsModule;
let CacheModule;

class _APIModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("api");
	}

	/**
	 * Initialises the api module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			AppModule = this.moduleManager.modules.app;
			PlaylistsModule = this.moduleManager.modules.playlists;
			UtilsModule = this.moduleManager.modules.utils;
			PunishmentsModule = this.moduleManager.modules.punishments;
			CacheModule = this.moduleManager.modules.cache;

			const SIDname = config.get("cookie.SIDname");

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

					response.app.get("/export/privatePlaylist/:playlistId", isLoggedIn, (req, res) => {
						const { playlistId } = req.params;
						PlaylistsModule.runJob("GET_PLAYLIST", { playlistId })
							.then(playlist => {
								if (playlist.createdBy === req.session.userId)
									res.json({ status: "success", playlist });
								else res.json({ status: "error", message: "You're not the owner." });
							})
							.catch(err => {
								res.json({ status: "error", message: err.message });
							});
					});

					resolve();
				})
				.catch(err => {
					reject(err);
				});
		});
	}
}

export default new _APIModule();
