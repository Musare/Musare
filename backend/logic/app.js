import config from "config";
import axios from "axios";
import async from "async";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import express from "express";
import oauth from "oauth";
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
			this.server = app.listen(config.get("serverPort"));

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

			const oauth2 = new OAuth2(
				config.get("apis.github.client"),
				config.get("apis.github.secret"),
				"https://github.com/",
				"login/oauth/authorize",
				"login/oauth/access_token",
				null
			);

			const redirectUri = `${config.get("serverDomain")}/auth/github/authorize/callback`;

			/**
			 * @param {object} res - response object from Express
			 * @param {string} err - custom error message
			 */
			function redirectOnErr(res, err) {
				res.redirect(`${config.get("domain")}/?err=${encodeURIComponent(err)}`);
			}

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
					`redirect_uri=${config.get("serverDomain")}/auth/github/authorize/callback`,
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
					`redirect_uri=${config.get("serverDomain")}/auth/github/authorize/callback`,
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
								.then(res => next(null, res))
								.catch(err => next(err));
						},

						(res, next) => {
							if (res.status !== 200) return next(res.data.message);

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
															id: res.data.id,
															accessToken
														}
													}
												},
												{ runValidators: true },
												err => {
													if (err) return next(err);
													return next(null, user, res.data);
												}
											);
										},

										user => {
											CacheModule.runJob("PUB", {
												channel: "user.linkGithub",
												value: user._id
											});
											res.redirect(`${config.get("domain")}/settings#security`);
										}
									],
									next
								);
							}

							if (!res.data.id) return next("Something went wrong, no id.");

							return userModel.findOne({ "services.github.id": res.data.id }, (err, user) => {
								next(err, user, res.data);
							});
						},

						(user, _body, next) => {
							body = _body;

							if (user) {
								user.services.github.access_token = accessToken;
								return user.save(() => next(true, user._id));
							}

							return userModel.findOne({ username: new RegExp(`^${body.login}$`, "i") }, (err, user) =>
								next(err, user)
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
								_id, // TODO Check if exists
								username: body.login,
								name: body.name,
								location: body.location,
								bio: body.bio,
								email: {
									address,
									verificationToken
								},
								services: {
									github: { id: body.id, accessToken }
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
							PlaylistsModule.runJob("CREATE_READ_ONLY_PLAYLIST", {
								userId,
								displayName: "Liked Songs",
								type: "user"
							})
								.then(likedSongsPlaylist => {
									next(null, likedSongsPlaylist, userId);
								})
								.catch(err => next(err));
						},

						// create a disliked songs playlist for the new user
						(likedSongsPlaylist, userId, next) => {
							PlaylistsModule.runJob("CREATE_READ_ONLY_PLAYLIST", {
								userId,
								displayName: "Disliked Songs",
								type: "user"
							})
								.then(dislikedSongsPlaylist => {
									next(null, { likedSongsPlaylist, dislikedSongsPlaylist }, userId);
								})
								.catch(err => next(err));
						},

						// associate liked + disliked songs playlist to the user object
						({ likedSongsPlaylist, dislikedSongsPlaylist }, userId, next) => {
							userModel.updateOne(
								{ _id: userId },
								{ $set: { likedSongsPlaylist, dislikedSongsPlaylist } },
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
								activityType: "created_account"
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

			app.get("/auth/verify_email", async (req, res) => {
				if (this.getStatus() !== "READY") {
					this.log(
						"INFO",
						"APP_REJECTED_GITHUB_AUTHORIZE",
						`A user tried to use github authorize, but the APP module is currently not ready.`
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
								status: "failure",
								message: error
							});
						}

						this.log("INFO", "VERIFY_EMAIL", `Successfully verified email.`);

						return res.redirect(`${config.get("domain")}?msg=Thank you for verifying your email`);
					}
				);
			});

			return resolve();
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
