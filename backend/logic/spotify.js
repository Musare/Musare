const config = require('config'),
	  async  = require('async'),
	  logger = require('./logger'),
	  cache  = require('./cache');

const client = config.get("apis.spotify.client");
const secret = config.get("apis.spotify.secret");

const OAuth2 = require('oauth').OAuth2;
const SpotifyOauth = new OAuth2(
	client,
	secret, 
	'https://accounts.spotify.com/', 
	null,
	'api/token',
	null);

let apiResults = {
	access_token: "",
	token_type: "",
	expires_in: 0,
	expires_at: 0,
	scope: "",
};

let initialized = false;
let lockdown = false;

let lib = {
	init: (cb) => {
		async.waterfall([
			(next) => {
				cache.hget("api", "spotify", next, true);
			},

			(data, next) => {
				if (data) apiResults = data;
				next();
			}
		], (err) => {
			if (lockdown) return this._lockdown();
			if (err) {
				err = utils.getError(err);
				cb(err);
			} else {
				initialized = true;
				cb();
			}
		});
	},
	getToken: () => {
		return new Promise((resolve, reject) => {
			if (Date.now() > apiResults.expires_at) {
				lib.requestToken(() => {
					resolve(apiResults.access_token);
				});
			} else resolve(apiResults.access_token);
		});
	},
	requestToken: (cb) => {
		async.waterfall([
			(next) => {
				logger.info("SPOTIFY_REQUEST_TOKEN", "Requesting new Spotify token.");
				SpotifyOauth.getOAuthAccessToken(
					'',
					{ 'grant_type': 'client_credentials' },
					next
				);
			},
			(access_token, refresh_token, results, next) => {
				apiResults = results;
				apiResults.expires_at = Date.now() + (results.expires_in * 1000);
				cache.hset("api", "spotify", apiResults, next, true);
			}
		], () => {
			cb();
		});
	},
	_lockdown: () => {
		lockdown = true;
	}
};

module.exports = lib;