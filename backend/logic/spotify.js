const CoreClass = require("../core.js");

const config = require("config"),
    async = require("async");

let apiResults = {
    access_token: "",
    token_type: "",
    expires_in: 0,
    expires_at: 0,
    scope: "",
};

class SpotifyModule extends CoreClass {
    constructor() {
        super("spotify");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.cache = this.moduleManager.modules["cache"];
            this.utils = this.moduleManager.modules["utils"];

            const client = config.get("apis.spotify.client");
            const secret = config.get("apis.spotify.secret");

            const OAuth2 = require("oauth").OAuth2;
            this.SpotifyOauth = new OAuth2(
                client,
                secret,
                "https://accounts.spotify.com/",
                null,
                "api/token",
                null
            );

            async.waterfall(
                [
                    (next) => {
                        this.setStage(2);
                        this.cache
                            .runJob("HGET", { table: "api", key: "spotify" })
                            .then((data) => {
                                next(null, data);
                            })
                            .catch(next);
                    },

                    (data, next) => {
                        this.setStage(3);
                        if (data) apiResults = data;
                        next();
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await this.utils.runJob("GET_ERROR", {
                            error: err,
                        });
                        reject(new Error(err));
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    GET_TOKEN(payload) {
        return new Promise((resolve, reject) => {
            if (Date.now() > apiResults.expires_at) {
                this.runJob("REQUEST_TOKEN").then(() => {
                    resolve(apiResults.access_token);
                });
            } else resolve(apiResults.access_token);
        });
    }

    REQUEST_TOKEN(payload) {
        //cb
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        this.log(
                            "INFO",
                            "SPOTIFY_REQUEST_TOKEN",
                            "Requesting new Spotify token."
                        );
                        this.SpotifyOauth.getOAuthAccessToken(
                            "",
                            { grant_type: "client_credentials" },
                            next
                        );
                    },
                    (access_token, refresh_token, results, next) => {
                        apiResults = results;
                        apiResults.expires_at =
                            Date.now() + results.expires_in * 1000;
                        this.cache
                            .runJob("HSET", {
                                table: "api",
                                key: "spotify",
                                value: apiResults,
                                stringifyJson: true,
                            })
                            .finally(() => {
                                next();
                            });
                    },
                ],
                () => {
                    resolve();
                }
            );
        });
    }
}

module.exports = new SpotifyModule();
