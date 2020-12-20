"use strict";

const async = require("async");
const config = require("config");
const request = require("request");
const bcrypt = require("bcrypt");
const sha256 = require("sha256");

const hooks = require("./hooks");

// const moduleManager = require("../../index");

const db = require("../db");
const mail = require("../mail");
const cache = require("../cache");
const punishments = require("../punishments");
const utils = require("../utils");
// const logger = require("../logger");
const activities = require("../activities");

cache.runJob("SUB", {
    channel: "user.updateUsername",
    cb: (user) => {
        utils.runJob("SOCKETS_FROM_USER", { userId: user._id }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.username.changed", user.username);
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.removeSessions",
    cb: (userId) => {
        utils.runJob("SOCKETS_FROM_USER_WITHOUT_CACHE", { userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("keep.event:user.session.removed");
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.linkPassword",
    cb: (userId) => {
        utils.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.linkPassword");
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.unlinkPassword",
    cb: userId => {
        utils.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.unlinkPassword");
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.linkGithub",
    cb: (userId) => {
        utils.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.linkGithub");
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.unlinkGithub",
    cb: userId => {
        utils.runJob("SOCKETS_FROM_USER", { userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.unlinkGithub");
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.ban",
    cb: (data) => {
        utils.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("keep.event:banned", data.punishment);
                socket.disconnect(true);
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.favoritedStation",
    cb: (data) => {
        utils.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit("event:user.favoritedStation", data.stationId);
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "user.unfavoritedStation",
    cb: (data) => {
        utils.runJob("SOCKETS_FROM_USER", { userId: data.userId }).then(response => {
            response.sockets.forEach((socket) => {
                socket.emit(
                    "event:user.unfavoritedStation",
                    data.stationId
                );
            });
        });
    },
});

module.exports = {
    /**
     * Lists all Users
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    index: hooks.adminRequired(async (session, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });

        async.waterfall(
            [
                (next) => {
                    userModel.find({}).exec(next);
                },
            ],
            async (err, users) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "USER_INDEX",
                        `Indexing users failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "USER_INDEX",
                        `Indexing users successful.`
                    );
                    let filteredUsers = [];
                    users.forEach((user) => {
                        filteredUsers.push({
                            _id: user._id,
                            username: user.username,
                            role: user.role,
                            liked: user.liked,
                            disliked: user.disliked,
                            songsRequested: user.statistics.songsRequested,
                            email: {
                                address: user.email.address,
                                verified: user.email.verified,
                            },
                            hasPassword: !!user.services.password,
                            services: { github: user.services.github },
                        });
                    });
                    return cb({ status: "success", data: filteredUsers });
                }
            }
        );
    }),

    /**
     * Logs user in
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} identifier - the email of the user
     * @param {String} password - the plaintext of the user
     * @param {Function} cb - gets called with the result
     */
    login: async (session, identifier, password, cb) => {
        identifier = identifier.toLowerCase();
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const sessionSchema = await cache.runJob("GET_SCHEMA", {
            schemaName: "session",
        });

        async.waterfall(
            [
                // check if a user with the requested identifier exists
                (next) => {
                    userModel.findOne(
                        {
                            $or: [{ "email.address": identifier }],
                        },
                        next
                    );
                },

                // if the user doesn't exist, respond with a failure
                // otherwise compare the requested password and the actual users password
                (user, next) => {
                    if (!user) return next("User not found");
                    if (
                        !user.services.password ||
                        !user.services.password.password
                    )
                        return next(
                            "The account you are trying to access uses GitHub to log in."
                        );
                    bcrypt.compare(
                        sha256(password),
                        user.services.password.password,
                        (err, match) => {
                            if (err) return next(err);
                            if (!match) return next("Incorrect password");
                            next(null, user);
                        }
                    );
                },

                (user, next) => {
                    utils.runJob("GUID", {}).then((sessionId) => {
                        next(null, user, sessionId);
                    });
                },

                (user, sessionId, next) => {
                    cache
                        .runJob("HSET", {
                            table: "sessions",
                            key: sessionId,
                            value: sessionSchema(sessionId, user._id),
                        })
                        .then(() => {
                            next(null, sessionId);
                        })
                        .catch(next);
                },
            ],
            async (err, sessionId) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "USER_PASSWORD_LOGIN",
                        `Login failed with password for user "${identifier}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "USER_PASSWORD_LOGIN",
                    `Login successful with password for user "${identifier}"`
                );
                cb({
                    status: "success",
                    message: "Login successful",
                    user: {},
                    SID: sessionId,
                });
            }
        );
    },

    /**
     * Registers a new user
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} username - the username for the new user
     * @param {String} email - the email for the new user
     * @param {String} password - the plaintext password for the new user
     * @param {Object} recaptcha - the recaptcha data
     * @param {Function} cb - gets called with the result
     */
    register: async function(
        session,
        username,
        email,
        password,
        recaptcha,
        cb
    ) {
        email = email.toLowerCase();
        let verificationToken = await utils.runJob("GENERATE_RANDOM_STRING", {
            length: 64,
        });
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const verifyEmailSchema = await mail.runJob("GET_SCHEMA", {
            schemaName: "verifyEmail",
        });

        async.waterfall(
            [
                (next) => {
                    if (config.get("registrationDisabled") === true)
                        return next("Registration is not allowed at this time.");
                    return next();
                },

                (next) => {
                    if (!db.passwordValid(password))
                        return next(
                            "Invalid password. Check if it meets all the requirements."
                        );
                    return next();
                },

                // verify the request with google recaptcha
                (next) => {
                    if (config.get("apis.recaptcha.enabled") === true)
                        request(
                            {
                                url:
                                    "https://www.google.com/recaptcha/api/siteverify",
                                method: "POST",
                                form: {
                                    secret: config.get("apis").recaptcha.secret,
                                    response: recaptcha,
                                },
                            },
                            next
                        );
                    else next(null, null, null);
                },

                // check if the response from Google recaptcha is successful
                // if it is, we check if a user with the requested username already exists
                (response, body, next) => {
                    if (config.get("apis.recaptcha.enabled") === true) {
                        let json = JSON.parse(body);
                        if (json.success !== true)
                            return next(
                                "Response from recaptcha was not successful."
                            );
                    }
                    userModel.findOne(
                        { username: new RegExp(`^${username}$`, "i") },
                        next
                    );
                },

                // if the user already exists, respond with that
                // otherwise check if a user with the requested email already exists
                (user, next) => {
                    if (user)
                        return next(
                            "A user with that username already exists."
                        );
                    userModel.findOne({ "email.address": email }, next);
                },

                // if the user already exists, respond with that
                // otherwise, generate a salt to use with hashing the new users password
                (user, next) => {
                    if (user)
                        return next("A user with that email already exists.");
                    bcrypt.genSalt(10, next);
                },

                // hash the password
                (salt, next) => {
                    bcrypt.hash(sha256(password), salt, next);
                },

                (hash, next) => {
                    utils
                        .runJob("GENERATE_RANDOM_STRING", { length: 12 })
                        .then((_id) => {
                            next(null, hash, _id);
                        });
                },

                // create the user object
                (hash, _id, next) => {
                    next(null, {
                        _id,
                        username,
                        email: {
                            address: email,
                            verificationToken,
                        },
                        services: {
                            password: {
                                password: hash,
                            },
                        },
                    });
                },

                // generate the url for gravatar avatar
                (user, next) => {
                    utils
                        .runJob("CREATE_GRAVATAR", {
                            email: user.email.address,
                        })
                        .then((url) => {
                            user.avatar = url;
                            next(null, user);
                        });
                },

                // save the new user to the database
                (user, next) => {
                    userModel.create(user, next);
                },

                // respond with the new user
                (newUser, next) => {
                    verifyEmailSchema(
                        email,
                        username,
                        verificationToken,
                        () => {
                            next(null, newUser);
                        }
                    );
                },
            ],
            async (err, user) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "USER_PASSWORD_REGISTER",
                        `Register failed with password for user "${username}"."${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    module.exports.login(session, email, password, (result) => {
                        let obj = {
                            status: "success",
                            message: "Successfully registered.",
                        };
                        if (result.status === "success") {
                            obj.SID = result.SID;
                        }
                        activities.runJob("ADD_ACTIVITY", {
                            userId: user._id,
                            activityType: "created_account",
                        });
                        console.log(
                            "SUCCESS",
                            "USER_PASSWORD_REGISTER",
                            `Register successful with password for user "${username}".`
                        );
                        return cb(obj);
                    });
                }
            }
        );
    },

    /**
     * Logs out a user
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    logout: (session, cb) => {
        async.waterfall(
            [
                (next) => {
                    cache
                        .runJob("HGET", {
                            table: "sessions",
                            key: session.sessionId,
                        })
                        .then((session) => {
                            next(null, session);
                        })
                        .catch(next);
                },

                (session, next) => {
                    if (!session) return next("Session not found");
                    next(null, session);
                },

                (session, next) => {
                    cache
                        .runJob("HDEL", {
                            table: "sessions",
                            key: session.sessionId,
                        })
                        .then(() => {
                            next();
                        })
                        .catch(next);
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "USER_LOGOUT",
                        `Logout failed. "${err}" `
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log("SUCCESS", "USER_LOGOUT", `Logout successful.`);
                    cb({
                        status: "success",
                        message: "Successfully logged out.",
                    });
                }
            }
        );
    },

    /**
     * Removes all sessions for a user
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} userId - the id of the user we are trying to delete the sessions of
     * @param {Function} cb - gets called with the result
     */
    removeSessions: hooks.loginRequired(async (session, userId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, (err, user) => {
                        if (err) return next(err);
                        if (user.role !== "admin" && session.userId !== userId)
                            return next(
                                "Only admins and the owner of the account can remove their sessions."
                            );
                        else return next();
                    });
                },

                (next) => {
                    cache
                        .runJob("HGETALL", { table: "sessions" })
                        .then((sessions) => {
                            next(null, sessions);
                        })
                        .catch(next);
                },

                (sessions, next) => {
                    if (!sessions)
                        return next(
                            "There are no sessions for this user to remove."
                        );
                    else {
                        let keys = Object.keys(sessions);
                        next(null, keys, sessions);
                    }
                },

                (keys, sessions, next) => {
                    cache.runJob("PUB", {
                        channel: "user.removeSessions",
                        value: userId,
                    });
                    async.each(
                        keys,
                        (sessionId, callback) => {
                            let session = sessions[sessionId];
                            if (session.userId === userId) {
                                cache
                                    .runJob("HDEL", {
                                        channel: "sessions",
                                        key: sessionId,
                                    })
                                    .then(() => {
                                        callback(null);
                                    })
                                    .catch(next);
                            }
                        },
                        (err) => {
                            next(err);
                        }
                    );
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REMOVE_SESSIONS_FOR_USER",
                        `Couldn't remove all sessions for user "${userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "REMOVE_SESSIONS_FOR_USER",
                        `Removed all sessions for user "${userId}".`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully removed all sessions.",
                    });
                }
            }
        );
    }),

    /**
     * Gets user object from username (only a few properties)
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} username - the username of the user we are trying to find
     * @param {Function} cb - gets called with the result
     */
    findByUsername: async (session, username, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne(
                        { username: new RegExp(`^${username}$`, "i") },
                        next
                    );
                },

                (account, next) => {
                    if (!account) return next("User not found.");
                    next(null, account);
                },
            ],
            async (err, account) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "FIND_BY_USERNAME",
                        `User not found for username "${username}". "${err}"`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "FIND_BY_USERNAME",
                        `User found for username "${username}".`
                    );
                    return cb({
                        status: "success",
                        data: {
                            _id: account._id,
                            name: account.name,
                            username: account.username,
                            location: account.location,
                            bio: account.bio,
                            role: account.role,
                            avatar: account.avatar,
                            createdAt: account.createdAt,
                        },
                    });
                }
            }
        );
    },

    /**
     * Gets a username from an userId
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} userId - the userId of the person we are trying to get the username from
     * @param {Function} cb - gets called with the result
     */
    getUsernameFromId: async (session, userId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        userModel
            .findById(userId)
            .then((user) => {
                if (user) {
                    console.log(
                        "SUCCESS",
                        "GET_USERNAME_FROM_ID",
                        `Found username for userId "${userId}".`
                    );
                    return cb({
                        status: "success",
                        data: user.username,
                    });
                } else {
                    console.log(
                        "ERROR",
                        "GET_USERNAME_FROM_ID",
                        `Getting the username from userId "${userId}" failed. User not found.`
                    );
                    cb({
                        status: "failure",
                        message: "Couldn't find the user.",
                    });
                }
            })
            .catch(async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "GET_USERNAME_FROM_ID",
                        `Getting the username from userId "${userId}" failed. "${err}"`
                    );
                    cb({ status: "failure", message: err });
                }
            });
    },

    //TODO Fix security issues
    /**
     * Gets user info from session
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    findBySession: async (session, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    cache
                        .runJob("HGET", {
                            table: "sessions",
                            key: session.sessionId,
                        })
                        .then((session) => {
                            next(null, session);
                        })
                        .catch(next);
                },

                (session, next) => {
                    if (!session) return next("Session not found.");
                    next(null, session);
                },

                (session, next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user) return next("User not found.");
                    next(null, user);
                },
            ],
            async (err, user) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "FIND_BY_SESSION",
                        `User not found. "${err}"`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    let data = {
                        email: {
                            address: user.email.address,
                        },
                        avatar: user.avatar,
                        username: user.username,
                        name: user.name,
                        location: user.location,
                        bio: user.bio,
                    };
                    if (
                        user.services.password &&
                        user.services.password.password
                    )
                        data.password = true;
                    if (user.services.github && user.services.github.id)
                        data.github = true;
                    console.log(
                        "SUCCESS",
                        "FIND_BY_SESSION",
                        `User found. "${user.username}".`
                    );
                    return cb({
                        status: "success",
                        data,
                    });
                }
            }
        );
    },

    /**
     * Updates a user's username
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newUsername - the new username
     * @param {Function} cb - gets called with the result
     */
    updateUsername: hooks.loginRequired(
        async (session, updatingUserId, newUsername, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        if (user.username === newUsername)
                            return next(
                                "New username can't be the same as the old username."
                            );
                        next(null);
                    },

                    (next) => {
                        userModel.findOne(
                            { username: new RegExp(`^${newUsername}$`, "i") },
                            next
                        );
                    },

                    (user, next) => {
                        if (!user) return next();
                        if (user._id === updatingUserId) return next();
                        next("That username is already in use.");
                    },

                    (next) => {
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { username: newUsername } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_USERNAME",
                            `Couldn't update username for user "${updatingUserId}" to username "${newUsername}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        cache.runJob("PUB", {
                            channel: "user.updateUsername",
                            value: {
                                username: newUsername,
                                _id: updatingUserId,
                            },
                        });
                        console.log(
                            "SUCCESS",
                            "UPDATE_USERNAME",
                            `Updated username for user "${updatingUserId}" to username "${newUsername}".`
                        );
                        cb({
                            status: "success",
                            message: "Username updated successfully",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's email
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newEmail - the new email
     * @param {Function} cb - gets called with the result
     */
    updateEmail: hooks.loginRequired(
        async (session, updatingUserId, newEmail, cb) => {
            newEmail = newEmail.toLowerCase();
            let verificationToken = await utils.runJob(
                "GENERATE_RANDOM_STRING",
                { length: 64 }
            );
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            const verifyEmailSchema = await mail.runJob("GET_SCHEMA", {
                schemaName: "verifyEmail",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        if (user.email.address === newEmail)
                            return next(
                                "New email can't be the same as your the old email."
                            );
                        next();
                    },

                    (next) => {
                        userModel.findOne({ "email.address": newEmail }, next);
                    },

                    (user, next) => {
                        if (!user) return next();
                        if (user._id === updatingUserId) return next();
                        next("That email is already in use.");
                    },

                    // regenerate the url for gravatar avatar
                    (next) => {
                        utils
                            .runJob("CREATE_GRAVATAR", { email: newEmail })
                            .then((url) => {
                                next(null, url);
                            });
                    },

                    (avatar, next) => {
                        userModel.updateOne(
                            { _id: updatingUserId },
                            {
                                $set: {
                                    avatar: avatar,
                                    "email.address": newEmail,
                                    "email.verified": false,
                                    "email.verificationToken": verificationToken,
                                },
                            },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        verifyEmailSchema(
                            newEmail,
                            user.username,
                            verificationToken,
                            () => {
                                next();
                            }
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_EMAIL",
                            `Couldn't update email for user "${updatingUserId}" to email "${newEmail}". '${err}'`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_EMAIL",
                            `Updated email for user "${updatingUserId}" to email "${newEmail}".`
                        );
                        cb({
                            status: "success",
                            message: "Email updated successfully.",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's name
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newBio - the new name
     * @param {Function} cb - gets called with the result
     */
    updateName: hooks.loginRequired(
        async (session, updatingUserId, newName, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { name: newName } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_NAME",
                            `Couldn't update name for user "${updatingUserId}" to name "${newName}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_NAME",
                            `Updated name for user "${updatingUserId}" to name "${newName}".`
                        );
                        cb({
                            status: "success",
                            message: "Name updated successfully",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's location
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newLocation - the new location
     * @param {Function} cb - gets called with the result
     */
    updateLocation: hooks.loginRequired(
        async (session, updatingUserId, newLocation, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { location: newLocation } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_LOCATION",
                            `Couldn't update location for user "${updatingUserId}" to location "${newLocation}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_LOCATION",
                            `Updated location for user "${updatingUserId}" to location "${newLocation}".`
                        );
                        cb({
                            status: "success",
                            message: "Location updated successfully",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's bio
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newBio - the new bio
     * @param {Function} cb - gets called with the result
     */
    updateBio: hooks.loginRequired(
        async (session, updatingUserId, newBio, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { bio: newBio } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_BIO",
                            `Couldn't update bio for user "${updatingUserId}" to bio "${newBio}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_BIO",
                            `Updated bio for user "${updatingUserId}" to bio "${newBio}".`
                        );
                        cb({
                            status: "success",
                            message: "Bio updated successfully",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates the type of a user's avatar
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newType - the new type
     * @param {Function} cb - gets called with the result
     */
    updateAvatarType: hooks.loginRequired(
        async (session, updatingUserId, newType, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (updatingUserId === session.userId)
                            return next(null, true);
                        userModel.findOne({ _id: session.userId }, next);
                    },

                    (user, next) => {
                        if (user !== true && (!user || user.role !== "admin"))
                            return next("Invalid permissions.");
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { "avatar.type": newType } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_AVATAR_TYPE",
                            `Couldn't update avatar type for user "${updatingUserId}" to type "${newType}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_AVATAR_TYPE",
                            `Updated avatar type for user "${updatingUserId}" to type "${newType}".`
                        );
                        cb({
                            status: "success",
                            message: "Avatar type updated successfully",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's role
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} updatingUserId - the updating user's id
     * @param {String} newRole - the new role
     * @param {Function} cb - gets called with the result
     */
    updateRole: hooks.adminRequired(
        async (session, updatingUserId, newRole, cb) => {
            newRole = newRole.toLowerCase();
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        userModel.findOne({ _id: updatingUserId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("User not found.");
                        else if (user.role === newRole)
                            return next(
                                "New role can't be the same as the old role."
                            );
                        else return next();
                    },
                    (next) => {
                        userModel.updateOne(
                            { _id: updatingUserId },
                            { $set: { role: newRole } },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "UPDATE_ROLE",
                            `User "${session.userId}" couldn't update role for user "${updatingUserId}" to role "${newRole}". "${err}"`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "UPDATE_ROLE",
                            `User "${session.userId}" updated the role of user "${updatingUserId}" to role "${newRole}".`
                        );
                        cb({
                            status: "success",
                            message: "Role successfully updated.",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates a user's password
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} previousPassword - the previous password
     * @param {String} newPassword - the new password
     * @param {Function} cb - gets called with the result
     */
    updatePassword: hooks.loginRequired(async (session, previousPassword, newPassword, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });

        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user.services.password)
                        return next(
                            "This account does not have a password set."
                        );
                    return next(null, user.services.password.password);
                },

                (storedPassword, next) => {
                    bcrypt.compare(sha256(previousPassword), storedPassword).then(res => {
                        if (res) return next();
                        else return next("Please enter the correct previous password.")
                    });
                },

                (next) => {
                    if (!db.passwordValid(newPassword))
                        return next(
                            "Invalid new password. Check if it meets all the requirements."
                        );
                    return next();
                },

                (next) => {
                    bcrypt.genSalt(10, next);
                },

                // hash the password
                (salt, next) => {
                    bcrypt.hash(sha256(newPassword), salt, next);
                },

                (hashedPassword, next) => {
                    userModel.updateOne(
                        { _id: session.userId },
                        {
                            $set: {
                                "services.password.password": hashedPassword,
                            },
                        },
                        next
                    );
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "UPDATE_PASSWORD",
                        `Failed updating user password of user '${session.userId}'. '${err}'.`
                    );
                    return cb({ status: "failure", message: err });
                }

                console.log(
                    "SUCCESS",
                    "UPDATE_PASSWORD",
                    `User '${session.userId}' updated their password.`
                );
                cb({
                    status: "success",
                    message: "Password successfully updated.",
                });
            }
        );
    }),

    /**
     * Requests a password for a session
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} email - the email of the user that requests a password reset
     * @param {Function} cb - gets called with the result
     */
    requestPassword: hooks.loginRequired(async (session, cb) => {
        let code = await utils.runJob("GENERATE_RANDOM_STRING", { length: 8 });
        const passwordRequestSchema = await mail.runJob("GET_SCHEMA", {
            schemaName: "passwordRequest",
        });
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user) return next("User not found.");
                    if (
                        user.services.password &&
                        user.services.password.password
                    )
                        return next("You already have a password set.");
                    next(null, user);
                },

                (user, next) => {
                    let expires = new Date();
                    expires.setDate(expires.getDate() + 1);
                    userModel.findOneAndUpdate(
                        { "email.address": user.email.address },
                        {
                            $set: {
                                "services.password": {
                                    set: { code: code, expires },
                                },
                            },
                        },
                        { runValidators: true },
                        next
                    );
                },

                (user, next) => {
                    passwordRequestSchema(
                        user.email.address,
                        user.username,
                        code,
                        next
                    );
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REQUEST_PASSWORD",
                        `UserId '${session.userId}' failed to request password. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "REQUEST_PASSWORD",
                        `UserId '${session.userId}' successfully requested a password.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully requested password.",
                    });
                }
            }
        );
    }),

    /**
     * Verifies a password code
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} code - the password code
     * @param {Function} cb - gets called with the result
     */
    verifyPasswordCode: hooks.loginRequired(async (session, code, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    if (!code || typeof code !== "string")
                        return next("Invalid code.");
                    userModel.findOne(
                        {
                            "services.password.set.code": code,
                            _id: session.userId,
                        },
                        next
                    );
                },

                (user, next) => {
                    if (!user) return next("Invalid code.");
                    if (user.services.password.set.expires < new Date())
                        return next("That code has expired.");
                    next(null);
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "VERIFY_PASSWORD_CODE",
                        `Code '${code}' failed to verify. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "VERIFY_PASSWORD_CODE",
                        `Code '${code}' successfully verified.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully verified password code.",
                    });
                }
            }
        );
    }),

    /**
     * Adds a password to a user with a code
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} code - the password code
     * @param {String} newPassword - the new password code
     * @param {Function} cb - gets called with the result
     */
    changePasswordWithCode: hooks.loginRequired(
        async (session, code, newPassword, cb) => {
            const userModel = await db.runJob("GET_MODEL", {
                modelName: "user",
            });
            async.waterfall(
                [
                    (next) => {
                        if (!code || typeof code !== "string")
                            return next("Invalid code.");
                        userModel.findOne(
                            { "services.password.set.code": code },
                            next
                        );
                    },

                    (user, next) => {
                        if (!user) return next("Invalid code.");
                        if (!user.services.password.set.expires > new Date())
                            return next("That code has expired.");
                        next();
                    },

                    (next) => {
                        if (!db.passwordValid(newPassword))
                            return next(
                                "Invalid password. Check if it meets all the requirements."
                            );
                        return next();
                    },

                    (next) => {
                        bcrypt.genSalt(10, next);
                    },

                    // hash the password
                    (salt, next) => {
                        bcrypt.hash(sha256(newPassword), salt, next);
                    },

                    (hashedPassword, next) => {
                        userModel.updateOne(
                            { "services.password.set.code": code },
                            {
                                $set: {
                                    "services.password.password": hashedPassword,
                                },
                                $unset: { "services.password.set": "" },
                            },
                            { runValidators: true },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "ADD_PASSWORD_WITH_CODE",
                            `Code '${code}' failed to add password. '${err}'`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "ADD_PASSWORD_WITH_CODE",
                            `Code '${code}' successfully added password.`
                        );
                        cache.runJob("PUB", {
                            channel: "user.linkPassword",
                            value: session.userId,
                        });
                        cb({
                            status: "success",
                            message: "Successfully added password.",
                        });
                    }
                }
            );
        }
    ),

    /**
     * Unlinks password from user
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    unlinkPassword: hooks.loginRequired(async (session, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user) return next("Not logged in.");
                    if (!user.services.github || !user.services.github.id)
                        return next(
                            "You can't remove password login without having GitHub login."
                        );
                    userModel.updateOne(
                        { _id: session.userId },
                        { $unset: { "services.password": "" } },
                        next
                    );
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "UNLINK_PASSWORD",
                        `Unlinking password failed for userId '${session.userId}'. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "UNLINK_PASSWORD",
                        `Unlinking password successful for userId '${session.userId}'.`
                    );
                    cache.runJob("PUB", {
                        channel: "user.unlinkPassword",
                        value: session.userId,
                    });
                    cb({
                        status: "success",
                        message: "Successfully unlinked password.",
                    });
                }
            }
        );
    }),

    /**
     * Unlinks GitHub from user
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    unlinkGitHub: hooks.loginRequired(async (session, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user) return next("Not logged in.");
                    if (
                        !user.services.password ||
                        !user.services.password.password
                    )
                        return next(
                            "You can't remove GitHub login without having password login."
                        );
                    userModel.updateOne(
                        { _id: session.userId },
                        { $unset: { "services.github": "" } },
                        next
                    );
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "UNLINK_GITHUB",
                        `Unlinking GitHub failed for userId '${session.userId}'. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "UNLINK_GITHUB",
                        `Unlinking GitHub successful for userId '${session.userId}'.`
                    );
                    cache.runJob("PUB", {
                        channel: "user.unlinkGithub",
                        value: session.userId,
                    });
                    cb({
                        status: "success",
                        message: "Successfully unlinked GitHub.",
                    });
                }
            }
        );
    }),

    /**
     * Requests a password reset for an email
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} email - the email of the user that requests a password reset
     * @param {Function} cb - gets called with the result
     */
    requestPasswordReset: async (session, email, cb) => {
        let code = await utils.runJob("GENERATE_RANDOM_STRING", { length: 8 });
        console.log(111, code);
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const resetPasswordRequestSchema = await mail.runJob("GET_SCHEMA", {
            schemaName: "resetPasswordRequest",
        });
        async.waterfall(
            [
                (next) => {
                    if (!email || typeof email !== "string")
                        return next("Invalid email.");
                    email = email.toLowerCase();
                    userModel.findOne({ "email.address": email }, next);
                },

                (user, next) => {
                    if (!user) return next("User not found.");
                    if (
                        !user.services.password ||
                        !user.services.password.password
                    )
                        return next(
                            "User does not have a password set, and probably uses GitHub to log in."
                        );
                    next(null, user);
                },

                (user, next) => {
                    let expires = new Date();
                    expires.setDate(expires.getDate() + 1);
                    userModel.findOneAndUpdate(
                        { "email.address": email },
                        {
                            $set: {
                                "services.password.reset": {
                                    code: code,
                                    expires,
                                },
                            },
                        },
                        { runValidators: true },
                        next
                    );
                },

                (user, next) => {
                    resetPasswordRequestSchema(
                        user.email.address,
                        user.username,
                        code,
                        next
                    );
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REQUEST_PASSWORD_RESET",
                        `Email '${email}' failed to request password reset. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "REQUEST_PASSWORD_RESET",
                        `Email '${email}' successfully requested a password reset.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully requested password reset.",
                    });
                }
            }
        );
    },

    /**
     * Verifies a reset code
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} code - the password reset code
     * @param {Function} cb - gets called with the result
     */
    verifyPasswordResetCode: async (session, code, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    if (!code || typeof code !== "string")
                        return next("Invalid code.");
                    userModel.findOne(
                        { "services.password.reset.code": code },
                        next
                    );
                },

                (user, next) => {
                    if (!user) return next("Invalid code.");
                    if (!user.services.password.reset.expires > new Date())
                        return next("That code has expired.");
                    next(null);
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "VERIFY_PASSWORD_RESET_CODE",
                        `Code '${code}' failed to verify. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "VERIFY_PASSWORD_RESET_CODE",
                        `Code '${code}' successfully verified.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully verified password reset code.",
                    });
                }
            }
        );
    },

    /**
     * Changes a user's password with a reset code
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} code - the password reset code
     * @param {String} newPassword - the new password reset code
     * @param {Function} cb - gets called with the result
     */
    changePasswordWithResetCode: async (session, code, newPassword, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    if (!code || typeof code !== "string")
                        return next("Invalid code.");
                    userModel.findOne(
                        { "services.password.reset.code": code },
                        next
                    );
                },

                (user, next) => {
                    if (!user) return next("Invalid code.");
                    if (!user.services.password.reset.expires > new Date())
                        return next("That code has expired.");
                    next();
                },

                (next) => {
                    if (!db.passwordValid(newPassword))
                        return next(
                            "Invalid password. Check if it meets all the requirements."
                        );
                    return next();
                },

                (next) => {
                    bcrypt.genSalt(10, next);
                },

                // hash the password
                (salt, next) => {
                    bcrypt.hash(sha256(newPassword), salt, next);
                },

                (hashedPassword, next) => {
                    userModel.updateOne(
                        { "services.password.reset.code": code },
                        {
                            $set: {
                                "services.password.password": hashedPassword,
                            },
                            $unset: { "services.password.reset": "" },
                        },
                        { runValidators: true },
                        next
                    );
                },
            ],
            async (err) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "CHANGE_PASSWORD_WITH_RESET_CODE",
                        `Code '${code}' failed to change password. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "CHANGE_PASSWORD_WITH_RESET_CODE",
                        `Code '${code}' successfully changed password.`
                    );
                    cb({
                        status: "success",
                        message: "Successfully changed password.",
                    });
                }
            }
        );
    },

    /**
     * Bans a user by userId
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} value - the user id that is going to be banned
     * @param {String} reason - the reason for the ban
     * @param {String} expiresAt - the time the ban expires
     * @param {Function} cb - gets called with the result
     */
    banUserById: hooks.adminRequired(
        (session, userId, reason, expiresAt, cb) => {
            async.waterfall(
                [
                    (next) => {
                        if (!userId)
                            return next("You must provide a userId to ban.");
                        else if (!reason)
                            return next(
                                "You must provide a reason for the ban."
                            );
                        else return next();
                    },

                    (next) => {
                        if (!expiresAt || typeof expiresAt !== "string")
                            return next("Invalid expire date.");
                        let date = new Date();
                        switch (expiresAt) {
                            case "1h":
                                expiresAt = date.setHours(date.getHours() + 1);
                                break;
                            case "12h":
                                expiresAt = date.setHours(date.getHours() + 12);
                                break;
                            case "1d":
                                expiresAt = date.setDate(date.getDate() + 1);
                                break;
                            case "1w":
                                expiresAt = date.setDate(date.getDate() + 7);
                                break;
                            case "1m":
                                expiresAt = date.setMonth(date.getMonth() + 1);
                                break;
                            case "3m":
                                expiresAt = date.setMonth(date.getMonth() + 3);
                                break;
                            case "6m":
                                expiresAt = date.setMonth(date.getMonth() + 6);
                                break;
                            case "1y":
                                expiresAt = date.setFullYear(
                                    date.getFullYear() + 1
                                );
                                break;
                            case "never":
                                expiresAt = new Date(3093527980800000);
                                break;
                            default:
                                return next("Invalid expire date.");
                        }

                        next();
                    },

                    (next) => {
                        punishments
                            .runJob("ADD_PUNISHMENT", {
                                type: "banUserId",
                                value: userId,
                                reason,
                                expiresAt,
                                punishedBy,
                            })
                            .then((punishment) => {
                                next(null, punishment);
                            })
                            .catch(next);
                    },

                    (punishment, next) => {
                        cache.runJob("PUB", {
                            channel: "user.ban",
                            value: { userId, punishment },
                        });
                        next();
                    },
                ],
                async (err) => {
                    if (err && err !== true) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "BAN_USER_BY_ID",
                            `User ${session.userId} failed to ban user ${userId} with the reason ${reason}. '${err}'`
                        );
                        cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "BAN_USER_BY_ID",
                            `User ${session.userId} has successfully banned user ${userId} with the reason ${reason}.`
                        );
                        cb({
                            status: "success",
                            message: "Successfully banned user.",
                        });
                    }
                }
            );
        }
    ),

    getFavoriteStations: hooks.loginRequired(async (session, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.findOne({ _id: session.userId }, next);
                },

                (user, next) => {
                    if (!user) return next("User not found.");
                    next(null, user);
                },
            ],
            async (err, user) => {
                if (err && err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "GET_FAVORITE_STATIONS",
                        `User ${session.userId} failed to get favorite stations. '${err}'`
                    );
                    cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "GET_FAVORITE_STATIONS",
                        `User ${session.userId} got favorite stations.`
                    );
                    cb({
                        status: "success",
                        favoriteStations: user.favoriteStations,
                    });
                }
            }
        );
    }),
};
