const CoreClass = require("../core.js");

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const config = require("config");
const async = require("async");
const request = require("request");
const OAuth2 = require("oauth").OAuth2;

class AppModule extends CoreClass {
    constructor() {
        super("app");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            const mail = this.moduleManager.modules["mail"],
                cache = this.moduleManager.modules["cache"],
                db = this.moduleManager.modules["db"],
                activities = this.moduleManager.modules["activities"];

            this.utils = this.moduleManager.modules["utils"];

            let app = (this.app = express());
            const SIDname = config.get("cookie.SIDname");
            this.server = app.listen(config.get("serverPort"));

            app.use(cookieParser());

            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({ extended: true }));

            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });

            let corsOptions = Object.assign({}, config.get("cors"));

            app.use(cors(corsOptions));
            app.options("*", cors(corsOptions));

            let oauth2 = new OAuth2(
                config.get("apis.github.client"),
                config.get("apis.github.secret"),
                "https://github.com/",
                "login/oauth/authorize",
                "login/oauth/access_token",
                null
            );

            let redirect_uri =
                config.get("serverDomain") + "/auth/github/authorize/callback";

            app.get("/auth/github/authorize", async (req, res) => {
                if (this.getStatus() !== "READY") {
                    this.log(
                        "INFO",
                        "APP_REJECTED_GITHUB_AUTHORIZE",
                        `A user tried to use github authorize, but the APP module is currently not ready.`
                    );
                    return redirectOnErr(
                        res,
                        "Something went wrong on our end. Please try again later."
                    );
                }

                let params = [
                    `client_id=${config.get("apis.github.client")}`,
                    `redirect_uri=${config.get(
                        "serverDomain"
                    )}/auth/github/authorize/callback`,
                    `scope=user:email`,
                ].join("&");
                res.redirect(
                    `https://github.com/login/oauth/authorize?${params}`
                );
            });

            app.get("/auth/github/link", async (req, res) => {
                if (this.getStatus() !== "READY") {
                    this.log(
                        "INFO",
                        "APP_REJECTED_GITHUB_AUTHORIZE",
                        `A user tried to use github authorize, but the APP module is currently not ready.`
                    );
                    return redirectOnErr(
                        res,
                        "Something went wrong on our end. Please try again later."
                    );
                }
                let params = [
                    `client_id=${config.get("apis.github.client")}`,
                    `redirect_uri=${config.get(
                        "serverDomain"
                    )}/auth/github/authorize/callback`,
                    `scope=user:email`,
                    `state=${req.cookies[SIDname]}`,
                ].join("&");
                res.redirect(
                    `https://github.com/login/oauth/authorize?${params}`
                );
            });

            function redirectOnErr(res, err) {
                return res.redirect(
                    `${config.get("domain")}/?err=${encodeURIComponent(err)}`
                );
            }

            app.get("/auth/github/authorize/callback", async (req, res) => {
                if (this.getStatus() !== "READY") {
                    this.log(
                        "INFO",
                        "APP_REJECTED_GITHUB_AUTHORIZE",
                        `A user tried to use github authorize, but the APP module is currently not ready.`
                    );
                    return redirectOnErr(
                        res,
                        "Something went wrong on our end. Please try again later."
                    );
                }

                let code = req.query.code;
                let access_token;
                let body;
                let address;

                const state = req.query.state;

                const verificationToken = await this.utils.runJob(
                    "GENERATE_RANDOM_STRING",
                    { length: 64 }
                );

                async.waterfall(
                    [
                        (next) => {
                            if (req.query.error)
                                return next(req.query.error_description);
                            next();
                        },

                        (next) => {
                            oauth2.getOAuthAccessToken(
                                code,
                                { redirect_uri },
                                next
                            );
                        },

                        (_access_token, refresh_token, results, next) => {
                            if (results.error)
                                return next(results.error_description);
                            access_token = _access_token;
                            request.get(
                                {
                                    url: `https://api.github.com/user`,
                                    headers: {
                                        "User-Agent": "request",
                                        Authorization: `token ${access_token}`,
                                    },
                                },
                                next
                            );
                        },

                        (httpResponse, _body, next) => {
                            body = _body = JSON.parse(_body);
                            if (httpResponse.statusCode !== 200)
                                return next(body.message);
                            if (state) {
                                return async.waterfall(
                                    [
                                        (next) => {
                                            cache
                                                .runJob("HGET", {
                                                    table: "sessions",
                                                    key: state,
                                                })
                                                .then((session) =>
                                                    next(null, session)
                                                )
                                                .catch(next);
                                        },

                                        (session, next) => {
                                            if (!session)
                                                return next("Invalid session.");
                                            userModel.findOne(
                                                { _id: session.userId },
                                                next
                                            );
                                        },

                                        (user, next) => {
                                            if (!user)
                                                return next("User not found.");
                                            if (
                                                user.services.github &&
                                                user.services.github.id
                                            )
                                                return next(
                                                    "Account already has GitHub linked."
                                                );
                                            userModel.updateOne(
                                                { _id: user._id },
                                                {
                                                    $set: {
                                                        "services.github": {
                                                            id: body.id,
                                                            access_token,
                                                        },
                                                    },
                                                },
                                                { runValidators: true },
                                                (err) => {
                                                    if (err) return next(err);
                                                    next(null, user, body);
                                                }
                                            );
                                        },

                                        (user) => {
                                            cache.runJob("PUB", {
                                                channel: "user.linkGithub",
                                                value: user._id,
                                            });
                                            res.redirect(
                                                `${config.get(
                                                    "domain"
                                                )}/settings`
                                            );
                                        },
                                    ],
                                    next
                                );
                            }

                            if (!body.id)
                                return next("Something went wrong, no id.");
                            userModel.findOne(
                                { "services.github.id": body.id },
                                (err, user) => {
                                    next(err, user, body);
                                }
                            );
                        },

                        (user, body, next) => {
                            if (user) {
                                user.services.github.access_token = access_token;
                                return user.save(() => {
                                    next(true, user._id);
                                });
                            }
                            userModel.findOne(
                                {
                                    username: new RegExp(
                                        `^${body.login}$`,
                                        "i"
                                    ),
                                },
                                (err, user) => {
                                    next(err, user);
                                }
                            );
                        },

                        (user, next) => {
                            if (user)
                                return next(
                                    "An account with that username already exists."
                                );
                            request.get(
                                {
                                    url: `https://api.github.com/user/emails`,
                                    headers: {
                                        "User-Agent": "request",
                                        Authorization: `token ${access_token}`,
                                    },
                                },
                                next
                            );
                        },

                        (httpResponse, body2, next) => {
                            body2 = JSON.parse(body2);
                            if (!Array.isArray(body2))
                                return next(body2.message);

                            body2.forEach((email) => {
                                if (email.primary)
                                    address = email.email.toLowerCase();
                            });

                            userModel.findOne(
                                { "email.address": address },
                                next
                            );
                        },

                        (user, next) => {
                            this.utils
                                .runJob("GENERATE_RANDOM_STRING", {
                                    length: 12,
                                })
                                .then((_id) => {
                                    next(null, user, _id);
                                });
                        },

                        (user, _id, next) => {
                            if (user)
                                return next(
                                    "An account with that email address already exists."
                                );

                            next(null, {
                                _id, //TODO Check if exists
                                username: body.login,
                                name: body.name,
                                location: body.location,
                                bio: body.bio,
                                email: {
                                    address,
                                    verificationToken,
                                },
                                services: {
                                    github: { id: body.id, access_token },
                                },
                            });
                        },

                        // generate the url for gravatar avatar
                        (user, next) => {
                            this.utils
                                .runJob("CREATE_GRAVATAR", {
                                    email: user.email.address,
                                })
                                .then((url) => {
                                    user.avatar = { type: "gravatar", url };
                                    next(null, user);
                                });
                        },

                        // save the new user to the database
                        (user, next) => {
                            userModel.create(user, next);
                        },

                        // add the activity of account creation
                        (user, next) => {
                            activities.runJob("ADD_ACTIVITY", {
                                userId: user._id,
                                activityType: "created_account",
                            });
                            next(null, user);
                        },

                        (user, next) => {
                            mail.runJob("GET_SCHEMA", {
                                schemaName: "verifyEmail",
                            }).then((verifyEmailSchema) => {
                                verifyEmailSchema(
                                    address,
                                    body.login,
                                    user.email.verificationToken
                                );
                                next(null, user._id);
                            });
                        },
                    ],
                    async (err, userId) => {
                        if (err && err !== true) {
                            err = await this.utils.runJob("GET_ERROR", {
                                error: err,
                            });
                            console.log(
                                "ERROR",
                                "AUTH_GITHUB_AUTHORIZE_CALLBACK",
                                `Failed to authorize with GitHub. "${err}"`
                            );
                            return redirectOnErr(res, err);
                        }

                        const sessionId = await this.utils.runJob("GUID", {});
                        const sessionSchema = await cache.runJob("GET_SCHEMA", {
                            schemaName: "session",
                        });
                        cache
                            .runJob("HSET", {
                                table: "sessions",
                                key: sessionId,
                                value: sessionSchema(sessionId, userId),
                            })
                            .then(() => {
                                let date = new Date();
                                date.setTime(
                                    new Date().getTime() +
                                        2 * 365 * 24 * 60 * 60 * 1000
                                );
                                res.cookie(SIDname, sessionId, {
                                    expires: date,
                                    secure: config.get("cookie.secure"),
                                    path: "/",
                                    domain: config.get("cookie.domain"),
                                });
                                logger.success(
                                    "AUTH_GITHUB_AUTHORIZE_CALLBACK",
                                    `User "${userId}" successfully authorized with GitHub.`
                                );
                                res.redirect(`${config.get("domain")}/`);
                            })
                            .catch((err) => {
                                return redirectOnErr(res, err.message);
                            });
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
                    return redirectOnErr(
                        res,
                        "Something went wrong on our end. Please try again later."
                    );
                }

                let code = req.query.code;

                async.waterfall(
                    [
                        (next) => {
                            if (!code) return next("Invalid code.");
                            next();
                        },

                        (next) => {
                            userModel.findOne(
                                { "email.verificationToken": code },
                                next
                            );
                        },

                        (user, next) => {
                            if (!user) return next("User not found.");
                            if (user.email.verified)
                                return next("This email is already verified.");
                            userModel.updateOne(
                                { "email.verificationToken": code },
                                {
                                    $set: { "email.verified": true },
                                    $unset: { "email.verificationToken": "" },
                                },
                                { runValidators: true },
                                next
                            );
                        },
                    ],
                    (err) => {
                        if (err) {
                            let error = "An error occurred.";
                            if (typeof err === "string") error = err;
                            else if (err.message) error = err.message;
                            console.log(
                                "ERROR",
                                "VERIFY_EMAIL",
                                `Verifying email failed. "${error}"`
                            );
                            return res.json({
                                status: "failure",
                                message: error,
                            });
                        }
                        logger.success(
                            "VERIFY_EMAIL",
                            `Successfully verified email.`
                        );
                        res.redirect(
                            `${config.get(
                                "domain"
                            )}?msg=Thank you for verifying your email`
                        );
                    }
                );
            });

            resolve();
        });
    }

    SERVER(payload) {
        return new Promise((resolve, reject) => {
            resolve(this.server);
        });
    }

    GET_APP(payload) {
        return new Promise((resolve, reject) => {
            resolve({ app: this.app });
        });
    }

    EXAMPLE_JOB(payload) {
        return new Promise((resolve, reject) => {
            if (true) {
                resolve({});
            } else {
                reject(new Error("Nothing changed."));
            }
        });
    }
}

module.exports = new AppModule();
