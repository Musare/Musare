import config from "config";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import express from "express";
import http from "http";

import CoreClass from "../core";

let AppModule;
let UsersModule;

class _AppModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("app");

		AppModule = this;
	}

	/**
	 * Initialises the app module
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		UsersModule = this.moduleManager.modules.users;

		const app = (this.app = express());
		const SIDname = config.get("cookie");
		this.server = http.createServer(app).listen(config.get("port"));

		app.use(cookieParser());

		app.use(bodyParser.json());
		app.use(bodyParser.urlencoded({ extended: true }));

		const appUrl = `${config.get("url.secure") ? "https" : "http"}://${config.get("url.host")}`;

		const corsOptions = JSON.parse(JSON.stringify(config.get("cors")));
		corsOptions.origin.push(appUrl);
		corsOptions.credentials = true;

		app.use(cors(corsOptions));
		app.options("*", cors(corsOptions));

		/**
		 * @param {object} res - response object from Express
		 * @param {string} err - custom error message
		 */
		function redirectOnErr(res, err) {
			res.redirect(`${appUrl}?err=${encodeURIComponent(err)}`);
		}

		if (config.get("apis.github.enabled")) {
			const redirectUri =
				config.get("apis.github.redirect_uri").length > 0
					? config.get("apis.github.redirect_uri")
					: `${appUrl}/backend/auth/github/authorize/callback`;

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
					`redirect_uri=${redirectUri}`,
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
					`redirect_uri=${redirectUri}`,
					`scope=user:email`,
					`state=${req.cookies[SIDname]}` // TODO don't do this
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

					redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					return;
				}

				const { code, state, error, error_description: errorDescription } = req.query;

				// GITHUB_AUTHORIZE_CALLBACK job handles login/register/linking
				UsersModule.runJob("GITHUB_AUTHORIZE_CALLBACK", { code, state, error, errorDescription })
					.then(({ redirectUrl, sessionId, userId }) => {
						if (sessionId) {
							const date = new Date();
							date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

							res.cookie(SIDname, sessionId, {
								expires: date,
								secure: config.get("url.secure"),
								path: "/",
								domain: config.get("url.host")
							});

							this.log(
								"INFO",
								"AUTH_GITHUB_AUTHORIZE_CALLBACK",
								`User "${userId}" successfully authorized with GitHub.`
							);
						}

						res.redirect(redirectUrl);
					})
					.catch(err => {
						this.log(
							"ERROR",
							"AUTH_GITHUB_AUTHORIZE_CALLBACK",
							`Failed to authorize with GitHub. "${err.message}"`
						);

						return redirectOnErr(res, err.message);
					});
			});
		}

		if (config.get("apis.oidc.enabled")) {
			app.get("/auth/oidc/authorize", async (req, res) => {
				if (this.getStatus() !== "READY") {
					this.log(
						"INFO",
						"APP_REJECTED_OIDC_AUTHORIZE",
						`A user tried to use OIDC authorize, but the APP module is currently not ready.`
					);
					return redirectOnErr(res, "Something went wrong on our end. Please try again later.");
				}

				const params = [
					`client_id=${config.get("apis.oidc.client_id")}`,
					`redirect_uri=${UsersModule.oidcRedirectUri}`,
					`scope=basic openid`, // TODO check if openid is necessary for us
					`response_type=code`
				].join("&");
				return res.redirect(`${UsersModule.oidcAuthorizationEndpoint}?${params}`);
			});

			app.get("/auth/oidc/authorize/callback", async (req, res) => {
				if (this.getStatus() !== "READY") {
					this.log(
						"INFO",
						"APP_REJECTED_OIDC_AUTHORIZE",
						`A user tried to use OIDC authorize, but the APP module is currently not ready.`
					);

					redirectOnErr(res, "Something went wrong on our end. Please try again later.");
					return;
				}

				const { code, state, error, error_description: errorDescription } = req.query;

				// OIDC_AUTHORIZE_CALLBACK job handles login/register
				UsersModule.runJob("OIDC_AUTHORIZE_CALLBACK", { code, state, error, errorDescription })
					.then(({ redirectUrl, sessionId, userId }) => {
						if (sessionId) {
							const date = new Date();
							date.setTime(new Date().getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

							res.cookie(SIDname, sessionId, {
								expires: date,
								secure: config.get("url.secure"),
								path: "/",
								domain: config.get("url.host")
							});

							this.log(
								"INFO",
								"AUTH_OIDC_AUTHORIZE_CALLBACK",
								`User "${userId}" successfully authorized with OIDC.`
							);
						}

						res.redirect(redirectUrl);
					})
					.catch(err => {
						this.log(
							"ERROR",
							"AUTH_OIDC_AUTHORIZE_CALLBACK",
							`Failed to authorize with OIDC. "${err.message}"`
						);

						return redirectOnErr(res, err.message);
					});
			});
		}

		app.get("/auth/verify_email", (req, res) => {
			if (this.getStatus() !== "READY") {
				this.log(
					"INFO",
					"APP_REJECTED_VERIFY_EMAIL",
					`A user tried to use verify email, but the APP module is currently not ready.`
				);
				redirectOnErr(res, "Something went wrong on our end. Please try again later.");
				return;
			}

			const { code } = req.query;

			UsersModule.runJob("VERIFY_EMAIL", { code })
				.then(() => {
					this.log("INFO", "VERIFY_EMAIL", `Successfully verified email.`);

					res.redirect(`${appUrl}?toast=Thank you for verifying your email`);
				})
				.catch(err => {
					this.log("ERROR", "VERIFY_EMAIL", `Verifying email failed. "${err.message}"`);

					res.json({
						status: "error",
						message: err.message
					});
				});
		});
	}

	/**
	 * Returns the express server
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	SERVER() {
		return new Promise(resolve => {
			resolve(AppModule.server);
		});
	}

	/**
	 * Returns the app object
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
