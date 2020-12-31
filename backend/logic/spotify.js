import config from "config";
import async from "async";
import oauth from "oauth";

import CoreClass from "../core";

const { OAuth2 } = oauth;

let apiResults = {
	access_token: "",
	token_type: "",
	expires_in: 0,
	expires_at: 0,
	scope: ""
};

let SpotifyModule;
let CacheModule;
let UtilsModule;

class _SpotifyModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("spotify");

		SpotifyModule = this;
	}

	/**
	 * Initialises the spotify module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			CacheModule = this.moduleManager.modules.cache;
			UtilsModule = this.moduleManager.modules.utils;

			const client = config.get("apis.spotify.client");
			const secret = config.get("apis.spotify.secret");

			this.SpotifyOauth = new OAuth2(client, secret, "https://accounts.spotify.com/", null, "api/token", null);

			async.waterfall(
				[
					next => {
						this.setStage(2);
						CacheModule.runJob("HGET", { table: "api", key: "spotify" })
							.then(data => {
								next(null, data);
							})
							.catch(next);
					},

					(data, next) => {
						this.setStage(3);
						if (data) apiResults = data;
						next();
					}
				],
				async err => {
					if (err) {
						err = await UtilsModule.runJob("GET_ERROR", {
							error: err
						});
						reject(new Error(err));
					} else {
						resolve();
					}
				}
			);
		});
	}

	/**
	 * Returns the request token for the Spotify api if one exists, otherwise creates a new one
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET_TOKEN() {
		return new Promise(resolve => {
			if (Date.now() > apiResults.expires_at) {
				SpotifyModule.runJob("REQUEST_TOKEN", null, this).then(() => {
					resolve(apiResults.access_token);
				});
			} else resolve(apiResults.access_token);
		});
	}

	/**
	 * Creates a request token for the Spotify api
	 *
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REQUEST_TOKEN() {
		return new Promise(resolve => {
			async.waterfall(
				[
					next => {
						SpotifyModule.log("INFO", "SPOTIFY_REQUEST_TOKEN", "Requesting new Spotify token.");
						SpotifyModule.SpotifyOauth.getOAuthAccessToken("", { grant_type: "client_credentials" }, next);
					},
					(accessToken, refreshToken, results, next) => {
						apiResults = results;
						apiResults.expires_at = Date.now() + results.expires_in * 1000;

						CacheModule.runJob(
							"HSET",
							{
								table: "api",
								key: "spotify",
								value: apiResults,
								stringifyJson: true
							},
							this
						).finally(() => next());
					}
				],
				() => resolve()
			);
		});
	}
}

export default new _SpotifyModule();
