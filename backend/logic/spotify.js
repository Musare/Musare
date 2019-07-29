const config = require('config');

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

let lib = {
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
		SpotifyOauth.getOAuthAccessToken(
			'',
			{ 'grant_type': 'client_credentials' },
			(e, access_token, refresh_token, results) => {
				apiResults = results;
				apiResults.expires_at = Date.now() + (results.expires_in * 1000);
				cb();
		});
	}
};

module.exports = lib;