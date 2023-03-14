import config from "config";
import axios from "axios";
import async from "async";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import express from "express";
import oauth from "oauth";
import http from "http";
import CoreClass from "../core";

const { OAuth2 } = oauth;

let AppModule;
let MailModule;
let CacheModule;
let DBModule;
let ActivitiesModule;
let PlaylistsModule;
let UtilsModule;

class _AppModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("app");

		AppModule = this;
	}

	/**
	 * Initialises the app module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise(resolve => {
			MailModule = this.moduleManager.modules.mail;
			CacheModule = this.moduleManager.modules.cache;
			DBModule = this.moduleManager.modules.db;
			ActivitiesModule = this.moduleManager.modules.activities;
			PlaylistsModule = this.moduleManager.modules.playlists;
			UtilsModule = this.moduleManager.modules.utils;

			const app = (this.app = express());
			const SIDname = config.get("cookie.SIDname");
			this.server = http.createServer(app).listen(config.get("serverPort"));

			app.use(cookieParser());

			app.use(bodyParser.json());
			app.use(bodyParser.urlencoded({ extended: true }));

			let userModel;
			DBModule.runJob("GET_MODEL", { modelName: "user" })
				.then(model => {
					userModel = model;
				})
				.catch(console.error);

			const corsOptions = { ...config.get("cors"), credentials: true };

			app.use(cors(corsOptions));
			app.options("*", cors(corsOptions));

			/**
			 * @param {object} res - response object from Express
			 * @param {string} err - custom error message
			 */
			function redirectOnErr(res, err) {
				res.redirect(`${config.get("domain")}?err=${encodeURIComponent(err)}`);
			}

			if (config.get("apis.github.enabled")) {
				const oauth2 = new OAuth2(
					config.get("apis.github.client"),
					config.get("apis.github.secret"),
					"https://github.com/",
					"login/oauth/authorize",
					"login/oauth/access_token",
					null
				);

				const redirectUri = `${config.get("apis.github.redirect_uri")}`;

				app.get("/auth/github/authorize", async (req, res) => {
					if (this.getStatus() !== "READY") {
						this.log(
							"INFO",
							"APP_REJECTED_GITHUB_AUTHORIZE",
							`A user tried to use github authorize, but the APP module is currently not ready.`
						);
						return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					}

					const params = [
						`client_id=${config.get("apis.github.client")}`,
						`redirect_uri=${config.get("apis.github.redirect_uri")}`,
						`scope=user:email`
					].join("&");
					return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
				});

				app.get("/auth/github/link", async (req, res) => {
					if (this.getStatus() !== "READY") {
						this.log(
							"INFO",
							"APP_REJECTED_GITHUB_AUTHORIZE",
							`A user tried to use github authorize, but the APP module is currently not ready.`
						);
						return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					}

					const params = [
						`client_id=${config.get("apis.github.client")}`,
						`redirect_uri=${config.get("apis.github.redirect_uri")}`,
						`scope=user:email`,
						`state=${req.cookies[SIDname]}`
					].join("&");
					return res.redirect(`https://github.com/login/oauth/authorize?${params}`);
				});

				app.get("/auth/github/authorize/callback", async (req, res) => {
					if (this.getStatus() !== "READY") {
						this.log(
							"INFO",
							"APP_REJECTED_GITHUB_AUTHORIZE",
							`A user tried to use github authorize, but the APP module is currently not ready.`
						);

						return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					}

					const { code } = req.query;
					let accessToken;
					let body;
					let address;

					const { state } = req.query;

					const verificationToken = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 64 });

					return async.waterfall(
						[
							next => {
								if (req.query.error) return next(req.query.error_description);
								return next();
							},

							next => {
								oauth2.getOAuthAccessToken(code, { redirect_uri: redirectUri }, next);
							},

							(_accessToken, refreshToken, results, next) => {
								if (results.error) return next(results.error_description);

								accessToken = _accessToken;

								const options = {
									headers: {
										"User-Agent": "request",
										Authorization: `token ${accessToken}`
									}
								};

								return axios
									.get("https://api.github.com/user", options)
									.then(github => next(null, github))
									.catch(err => next(err));
							},

							(github, next) => {
								if (github.status !== 200) return next(github.data.message);

								if (state) {
									return async.waterfall(
										[
											next => {
												CacheModule.runJob("HGET", {
													table: "sessions",
													key: state
												})
													.then(session => next(null, session))
													.catch(next);
											},

											(session, next) => {
												if (!session) return next("Invalid session.");
												return userModel.findOne({ _id: session.userId }, next);
											},

											(user, next) => {
												if (!user) return next("User not found.");
												if (user.services.github && user.services.github.id)
													return next("Account already has GitHub linked.");

												return userModel.updateOne(
													{ _id: user._id },
													{
														$set: {
															"services.github": {
																id: github.data.id,
																access_token: accessToken
															}
														}
													},
													{ runValidators: true },
													err => {
														if (err) return next(err);
														return next(null, user, github.data);
													}
												);
											},

											user => {
												CacheModule.runJob("PUB", {
													channel: "user.linkGithub",
													value: user._id
												});

												CacheModule.runJob("PUB", {
													channel: "user.updated",
													value: { userId: user._id }
												});

												res.redirect(`${config.get("domain")}/settings?tab=security`);
											}
										],
										next
									);
								}

								if (!github.data.id) return next("Something went wrong, no id.");

								return userModel.findOne({ "services.github.id": github.data.id }, (err, user) => {
									next(err, user, github.data);
								});
							},

							(user, _body, next) => {
								body = _body;

								if (user) {
									user.services.github.access_token = accessToken;
									return user.save(() => next(true, user._id));
								}

								return userModel.findOne(
									{
										username: new RegExp(`^${body.login}$`, "i")
									},
									(err, user) => next(err, user)
								);
							},

							(user, next) => {
								if (user) return next(`An account with that username already exists.`);

								return axios
									.get("https://api.github.com/user/emails", {
										headers: {
											"User-Agent": "request",
											Authorization: `token ${accessToken}`
										}
									})
									.then(res => next(null, res.data))
									.catch(err => next(err));
							},

							(body, next) => {
								if (!Array.isArray(body)) return next(body.message);

								body.forEach(email => {
									if (email.primary) address = email.email.toLowerCase();
								});

								return userModel.findOne({ "email.address": address }, next);
							},

							(user, next) => {
								UtilsModule.runJob("GENERATE_RANDOM_STRING", {
									length: 12
								}).then(_id => next(null, user, _id));
							},

							(user, _id, next) => {
								if (user) {
									if (Object.keys(JSON.parse(user.services.github)).length === 0)
										return next(
											`An account with that email address exists, but is not linked to GitHub.`
										);
									return next(`An account with that email address already exists.`);
								}

								return next(null, {
									_id,
									username: body.login,
									name: body.name,
									location: body.location,
									bio: body.bio,
									email: {
										address,
										verificationToken
									},
									services: {
										github: {
											id: body.id,
											access_token: accessToken
										}
									}
								});
							},

							// generate the url for gravatar avatar
							(user, next) => {
								UtilsModule.runJob("CREATE_GRAVATAR", {
									email: user.email.address
								}).then(url => {
									user.avatar = { type: "gravatar", url };
									next(null, user);
								});
							},

							// save the new user to the database
							(user, next) => {
								userModel.create(user, next);
							},

							(user, next) => {
								MailModule.runJob("GET_SCHEMA", {
									schemaName: "verifyEmail"
								}).then(verifyEmailSchema => {
									verifyEmailSchema(address, body.login, user.email.verificationToken, err => {
										next(err, user._id);
									});
								});
							},

							// create a liked songs playlist for the new user
							(userId, next) => {
								PlaylistsModule.runJob("CREATE_USER_PLAYLIST", {
									userId,
									displayName: "Liked Songs",
									type: "user-liked"
								})
									.then(likedSongsPlaylist => {
										next(null, likedSongsPlaylist, userId);
									})
									.catch(err => next(err));
							},

							// create a disliked songs playlist for the new user
							(likedSongsPlaylist, userId, next) => {
								PlaylistsModule.runJob("CREATE_USER_PLAYLIST", {
									userId,
									displayName: "Disliked Songs",
									type: "user-disliked"
								})
									.then(dislikedSongsPlaylist => {
										next(
											null,
											{
												likedSongsPlaylist,
												dislikedSongsPlaylist
											},
											userId
										);
									})
									.catch(err => next(err));
							},

							// associate liked + disliked songs playlist to the user object
							({ likedSongsPlaylist, dislikedSongsPlaylist }, userId, next) => {
								userModel.updateOne(
									{ _id: userId },
									{
										$set: {
											likedSongsPlaylist,
											dislikedSongsPlaylist
										}
									},
									{ runValidators: true },
									err => {
										if (err) return next(err);
										return next(null, userId);
									}
								);
							},

							// add the activity of account creation
							(userId, next) => {
								ActivitiesModule.runJob("ADD_ACTIVITY", {
									userId,
									type: "user__joined",
									payload: { message: "Welcome to Musare!" }
								});

								next(null, userId);
							}
						],
						async (err, userId) => {
							if (err && err !== true) {
								err = await UtilsModule.runJob("GET_ERROR", {
									error: err
								});

								this.log(
									"ERROR",
									"AUTH_GITHUB_AUTHORIZE_CALLBACK",
									`Failed to authorize with GitHub. "${err}"`
								);

								return redirectOnErr(res, err);
							}

							const sessionId = await UtilsModule.runJob("GUID", {});
							const sessionSchema = await CacheModule.runJob("GET_SCHEMA", {
								schemaName: "session"
							});

							return CacheModule.runJob("HSET", {
								table: "sessions",
								key: sessionId,
								value: sessionSchema(sessionId, userId)
							})
								.then(() => {
									const date = new Date();
									date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

									res.cookie(SIDname, sessionId, {
										expires: date,
										secure: config.get("cookie.secure"),
										path: "/",
										domain: config.get("cookie.domain")
									});

									this.log(
										"INFO",
										"AUTH_GITHUB_AUTHORIZE_CALLBACK",
										`User "${userId}" successfully authorized with GitHub.`
									);

									res.redirect(`${config.get("domain")}/`);
								})
								.catch(err => redirectOnErr(res, err.message));
						}
					);
				});
			}

			if (config.get("apis.google.enabled")) {
				const oauth2 = new OAuth2(
					config.get("apis.google.client"),
					config.get("apis.google.secret"),
					"https://accounts.google.com/o/oauth2/v2/auth",
					"https://accounts.google.com/o/oauth2/v2/token",
					"1.0",
					null,
					"HMAC-SHA1"
				);

				const redirectUri = `${config.get("apis.google.redirect_uri")}`;

				// http://localhost/backend/auth/google/link

				app.get("/auth/google/link", async (req, res) => {
					if (this.getStatus() !== "READY") {
						this.log(
							"INFO",
							"APP_REJECTED_GOOGLE_AUTHORIZE",
							`A user tried to use google authorize, but the APP module is currently not ready.`
						);
						return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					}

					if (!req.cookies[SIDname]) return redirectOnErr(res, "Not logged in.");

					const session = await CacheModule.runJob("HGET", {
						table: "sessions",
						key: req.cookies[SIDname]
					});
					if (!session) return redirectOnErr(res, "Not logged in.");

					const user = await userModel.findOne({ _id: session.userId });
					if (!user) return redirectOnErr(res, "Not logged in.");
					if (user.services.google && user.services.google.id)
						return redirectOnErr(res, "You already have a Google account linked");

					const state = await UtilsModule.runJob("GENERATE_RANDOM_STRING", { length: 16 });
					await CacheModule.runJob("HSET", {
						table: "oauth_google_state",
						key: state,
						value: user._id.toString()
					});

					const params = [
						`client_id=${config.get("apis.google.client")}`,
						`redirect_uri=${config.get("apis.google.redirect_uri")}`,
						`scope=https://www.googleapis.com/auth/youtube.readonly`,
						`state=${state}`,
						`response_type=token`
					].join("&");
					return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
				});

				app.get("/auth/google/authorize/callback", async (req, res) => {
					if (this.getStatus() !== "READY") {
						this.log(
							"INFO",
							"APP_REJECTED_GOOGLE_AUTHORIZE",
							`A user tried to use google authorize, but the APP module is currently not ready.`
						);

						return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					}

					const { code } = req.query;
					let body;
					let address;

					// TODO parse the proper response from Google, which uses a #

					return;

					const { state } = req.query;
					if (!state) return redirectOnErr(res, "No state given.");

					const userId = await CacheModule.runJob("HGET", { table: "oauth_google_state", key: state });
					if (!userId) return redirectOnErr(res, "Invalid state.");

					const user = await userModel.findOne({ _id: userId });
					if (!user) return redirectOnErr(res, "Invalid state");

					if (user.services.google && user.services.google.id)
						return redirectOnErr(res, "Account already has Google account linked.");

					if (req.query.error) return redirectOnErr(res, req.query.error_description);

					const { accessToken, refreshToken, results } = await new Promise((resolve, reject) => {
						oauth2.getOAuthAccessToken(
							code,
							{ redirect_uri: redirectUri },
							(err, accessToken, refreshToken, results) => {
								if (err) redirectOnErr(err.message);
								else {
									resolve({ accessToken, refreshToken, results });
								}
							}
						);
					});
					if (results.error) return redirectOnErr(res, results.error_description);

					const options = {
						headers: {
							"User-Agent": "request",
							Authorization: `token ${accessToken}`
						}
					};

					const google = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", options);

					console.log(321, google);

					return;

					await userModel.updateOne(
						{ _id: userId },
						{
							$set: {
								"services.google": {
									id: google.data.id,
									access_token: accessToken,
									refresh_token: refreshToken
								}
							}
						},
						{ runValidators: true }
					);

					CacheModule.runJob("PUB", {
						channel: "user.linkGoogle",
						value: userId
					});

					CacheModule.runJob("PUB", {
						channel: "user.updated",
						value: { userId }
					});

					res.redirect(`${config.get("domain")}/settings?tab=security`);
				});
			}

			app.get("/auth/verify_email", async (req, res) => {
				if (this.getStatus() !== "READY") {
					this.log(
						"INFO",
						"APP_REJECTED_VERIFY_EMAIL",
						`A user tried to use verify email, but the APP module is currently not ready.`
					);
					return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
				}

				const { code } = req.query;

				return async.waterfall(
					[
						next => {
							if (!code) return next("Invalid code.");
							return next();
						},

						next => {
							userModel.findOne({ "email.verificationToken": code }, next);
						},

						(user, next) => {
							if (!user) return next("User not found.");
							if (user.email.verified) return next("This email is already verified.");

							return userModel.updateOne(
								{ "email.verificationToken": code },
								{
									$set: { "email.verified": true },
									$unset: { "email.verificationToken": "" }
								},
								{ runValidators: true },
								next
							);
						}
					],
					err => {
						if (err) {
							let error = "An error occurred.";

							if (typeof err === "string") error = err;
							else if (err.message) error = err.message;

							this.log("ERROR", "VERIFY_EMAIL", `Verifying email failed. "${error}"`);

							return res.json({
								status: "error",
								message: error
							});
						}

						this.log("INFO", "VERIFY_EMAIL", `Successfully verified email.`);

						return res.redirect(`${config.get("domain")}?toast=Thank you for verifying your email`);
					}
				);
			});

			resolve();
		});
	}

	/**
	 * Returns the express server
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SERVER() {
		return new Promise(resolve => {
			resolve(AppModule.server);
		});
	}

	/**
	 * Returns the app object
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_APP() {
		return new Promise(resolve => {
			resolve({ app: AppModule.app });
		});
	}

	// EXAMPLE_JOB() {
	// 	return new Promise((resolve, reject) => {
	// 		if (true) resolve({});
	// 		else reject(new Error("Nothing changed."));
	// 	});
	// }
}

export default new _AppModule();
