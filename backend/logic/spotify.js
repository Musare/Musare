const coreClass = require("../core");

const config = require('config'),
	async  = require('async');

let apiResults = {
	access_token: "",
	token_type: "",
	expires_in: 0,
	expires_at: 0,
	scope: "",
};

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["cache"];
	}

	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.cache = this.moduleManager.modules["cache"];
			this.utils = this.moduleManager.modules["utils"];

			const client = config.get("apis.spotify.client");
			const secret = config.get("apis.spotify.secret");

			const OAuth2 = require('oauth').OAuth2;
			this.SpotifyOauth = new OAuth2(
				client,
				secret, 
				'https://accounts.spotify.com/', 
				null,
				'api/token',
				null);

			async.waterfall([
				(next) => {
					this.setStage(2);
					this.cache.hget("api", "spotify", next, true);
				},
	
				(data, next) => {
					this.setStage(3);
					if (data) apiResults = data;
					next();
				}
			], async (err) => {
				if (err) {
					err = await this.utils.getError(err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	async getToken() {
		try { await this._validateHook(); } catch { return; }

		return new Promise((resolve, reject) => {
			if (Date.now() > apiResults.expires_at) {
				this.requestToken(() => {
					resolve(apiResults.access_token);
				});
			} else resolve(apiResults.access_token);
		});
	}

	async requestToken(cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.logger.info("SPOTIFY_REQUEST_TOKEN", "Requesting new Spotify token.");
				this.SpotifyOauth.getOAuthAccessToken(
					'',
					{ 'grant_type': 'client_credentials' },
					next
				);
			},
			(access_token, refresh_token, results, next) => {
				apiResults = results;
				apiResults.expires_at = Date.now() + (results.expires_in * 1000);
				this.cache.hset("api", "spotify", apiResults, next, true);
			}
		], () => {
			cb();
		});
	}
}
