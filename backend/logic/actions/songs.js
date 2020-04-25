"use strict";

const async = require("async");

const hooks = require("./hooks");
const queueSongs = require("./queueSongs");

// const moduleManager = require("../../index");

const db = require("../db");
const songs = require("../songs");
const cache = require("../cache");
const utils = require("../utils");
const activities = require("../activities");
// const logger = moduleManager.modules["logger"];

cache.runJob("SUB", {
    channel: "song.removed",
    cb: (songId) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: "admin.songs",
            args: ["event:admin.song.removed", songId],
        });
    },
});

cache.runJob("SUB", {
    channel: "song.added",
    cb: async (songId) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        songModel.findOne({ _id: songId }, (err, song) => {
            utils.runJob("EMIT_TO_ROOM", {
                room: "admin.songs",
                args: ["event:admin.song.added", song],
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "song.updated",
    cb: async (songId) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        songModel.findOne({ _id: songId }, (err, song) => {
            utils.runJob("EMIT_TO_ROOM", {
                room: "admin.songs",
                args: ["event:admin.song.updated", song],
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "song.like",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `song.${data.songId}`,
            args: [
                "event:song.like",
                {
                    songId: data.songId,
                    likes: data.likes,
                    dislikes: data.dislikes,
                },
            ],
        });
        utils
            .runJob("SOCKETS_FROM_USER", { userId: data.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:song.newRatings", {
                        songId: data.songId,
                        liked: true,
                        disliked: false,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "song.dislike",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `song.${data.songId}`,
            args: [
                "event:song.dislike",
                {
                    songId: data.songId,
                    likes: data.likes,
                    dislikes: data.dislikes,
                },
            ],
        });
        utils
            .runJob("SOCKETS_FROM_USER", { userId: data.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:song.newRatings", {
                        songId: data.songId,
                        liked: false,
                        disliked: true,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "song.unlike",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `song.${data.songId}`,
            args: [
                "event:song.unlike",
                {
                    songId: data.songId,
                    likes: data.likes,
                    dislikes: data.dislikes,
                },
            ],
        });
        utils
            .runJob("SOCKETS_FROM_USER", { userId: data.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:song.newRatings", {
                        songId: data.songId,
                        liked: false,
                        disliked: false,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "song.undislike",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `song.${data.songId}`,
            args: [
                "event:song.undislike",
                {
                    songId: data.songId,
                    likes: data.likes,
                    dislikes: data.dislikes,
                },
            ],
        });
        utils
            .runJob("SOCKETS_FROM_USER", { userId: data.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:song.newRatings", {
                        songId: data.songId,
                        liked: false,
                        disliked: false,
                    });
                });
            });
    },
});

module.exports = {
    /**
     * Returns the length of the songs list
     *
     * @param session
     * @param cb
     */
    length: hooks.adminRequired(async (session, cb) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.countDocuments({}, next);
                },
            ],
            async (err, count) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_LENGTH",
                        `Failed to get length from songs. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "SONGS_LENGTH",
                    `Got length from songs successfully.`
                );
                cb(count);
            }
        );
    }),

    /**
     * Gets a set of songs
     *
     * @param session
     * @param set - the set number to return
     * @param cb
     */
    getSet: hooks.adminRequired(async (session, set, cb) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel
                        .find({})
                        .skip(15 * (set - 1))
                        .limit(15)
                        .exec(next);
                },
            ],
            async (err, songs) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_GET_SET",
                        `Failed to get set from songs. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "SONGS_GET_SET",
                    `Got set from songs successfully.`
                );
                cb(songs);
            }
        );
    }),

    /**
     * Gets a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    getSong: hooks.adminRequired((session, songId, cb) => {
        console.log(songId);

        async.waterfall(
            [
                (next) => {
                    song.getSong(songId, next);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_GET_SONG",
                        `Failed to get song ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "SONGS_GET_SONG",
                        `Got song ${songId} successfully.`
                    );
                    cb({ status: "success", data: song });
                }
            }
        );
    }),

    /**
     * Obtains basic metadata of a song in order to format an activity
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    getSongForActivity: (session, songId, cb) => {
        async.waterfall(
            [
                (next) => {
                    songs
                        .runJob("GET_SONG_FROM_ID", { songId })
                        .then((responsesong) => next(null, response.song))
                        .catch(next);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_GET_SONG_FOR_ACTIVITY",
                        `Failed to obtain metadata of song ${songId} for activity formatting. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    if (song) {
                        console.log(
                            "SUCCESS",
                            "SONGS_GET_SONG_FOR_ACTIVITY",
                            `Obtained metadata of song ${songId} for activity formatting successfully.`
                        );
                        cb({
                            status: "success",
                            data: {
                                title: song.title,
                                thumbnail: song.thumbnail,
                            },
                        });
                    } else {
                        console.log(
                            "ERROR",
                            "SONGS_GET_SONG_FOR_ACTIVITY",
                            `Song ${songId} does not exist so failed to obtain for activity formatting.`
                        );
                        cb({ status: "failure" });
                    }
                }
            }
        );
    },

    /**
     * Updates a song
     *
     * @param session
     * @param songId - the song id
     * @param song - the updated song object
     * @param cb
     */
    update: hooks.adminRequired(async (session, songId, song, cb) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.updateOne(
                        { _id: songId },
                        song,
                        { runValidators: true },
                        next
                    );
                },

                (res, next) => {
                    songs
                        .runJob("UPDATE_SONG", { songId })
                        .then((song) => next(null, song))
                        .catch(next);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_UPDATE",
                        `Failed to update song "${songId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "SONGS_UPDATE",
                    `Successfully updated song "${songId}".`
                );
                cache.runJob("PUB", {
                    channel: "song.updated",
                    value: song.songId,
                });
                cb({
                    status: "success",
                    message: "Song has been successfully updated",
                    data: song,
                });
            }
        );
    }),

    /**
     * Removes a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    remove: hooks.adminRequired(async (session, songId, cb) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.deleteOne({ _id: songId }, next);
                },

                (res, next) => {
                    //TODO Check if res gets returned from above
                    cache
                        .runJob("HDEL", { table: "songs", key: songId })
                        .then(() => next())
                        .catch(next);
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_UPDATE",
                        `Failed to remove song "${songId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "SONGS_UPDATE",
                    `Successfully remove song "${songId}".`
                );
                cache.runJob("PUB", { channel: "song.removed", value: songId });
                cb({
                    status: "success",
                    message: "Song has been successfully updated",
                });
            }
        );
    }),

    /**
     * Adds a song
     *
     * @param session
     * @param song - the song object
     * @param cb
     */
    add: hooks.adminRequired(async (session, song, cb) => {
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId: song.songId }, next);
                },

                (existingSong, next) => {
                    if (existingSong)
                        return next("Song is already in rotation.");
                    next();
                },

                (next) => {
                    const newSong = new songModel(song);
                    newSong.acceptedBy = session.userId;
                    newSong.acceptedAt = Date.now();
                    newSong.save(next);
                },

                (res, next) => {
                    queueSongs.remove(session, song._id, () => {
                        next();
                    });
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_ADD",
                        `User "${session.userId}" failed to add song. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "SONGS_ADD",
                    `User "${session.userId}" successfully added song "${song.songId}".`
                );
                cache.runJob("PUB", {
                    channel: "song.added",
                    value: song.songId,
                });
                cb({
                    status: "success",
                    message: "Song has been moved from the queue successfully.",
                });
            }
        );
        //TODO Check if video is in queue and Add the song to the appropriate stations
    }),

    /**
     * Likes a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    like: hooks.loginRequired(async (session, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId }, next);
                },

                (song, next) => {
                    if (!song) return next("No song found with that id.");
                    next(null, song);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_LIKE",
                        `User "${session.userId}" failed to like song ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                let oldSongId = songId;
                songId = song._id;
                userModel.findOne({ _id: session.userId }, (err, user) => {
                    if (user.liked.indexOf(songId) !== -1)
                        return cb({
                            status: "failure",
                            message: "You have already liked this song.",
                        });
                    userModel.updateOne(
                        { _id: session.userId },
                        {
                            $push: { liked: songId },
                            $pull: { disliked: songId },
                        },
                        (err) => {
                            if (!err) {
                                userModel.countDocuments(
                                    { liked: songId },
                                    (err, likes) => {
                                        if (err)
                                            return cb({
                                                status: "failure",
                                                message:
                                                    "Something went wrong while liking this song.",
                                            });
                                        userModel.countDocuments(
                                            { disliked: songId },
                                            (err, dislikes) => {
                                                if (err)
                                                    return cb({
                                                        status: "failure",
                                                        message:
                                                            "Something went wrong while liking this song.",
                                                    });
                                                songModel.update(
                                                    { _id: songId },
                                                    {
                                                        $set: {
                                                            likes: likes,
                                                            dislikes: dislikes,
                                                        },
                                                    },
                                                    (err) => {
                                                        if (err)
                                                            return cb({
                                                                status:
                                                                    "failure",
                                                                message:
                                                                    "Something went wrong while liking this song.",
                                                            });
                                                        songs.runJob(
                                                            "UPDATE_SONG",
                                                            { songId }
                                                        );
                                                        cache.runJob("PUB", {
                                                            channel:
                                                                "song.like",
                                                            value: JSON.stringify(
                                                                {
                                                                    songId: oldSongId,
                                                                    userId:
                                                                        session.userId,
                                                                    likes: likes,
                                                                    dislikes: dislikes,
                                                                }
                                                            ),
                                                        });
                                                        activities.runJob(
                                                            "ADD_ACTIVITY",
                                                            {
                                                                userId:
                                                                    session.userId,
                                                                activityType:
                                                                    "liked_song",
                                                                payload: [
                                                                    songId,
                                                                ],
                                                            }
                                                        );
                                                        return cb({
                                                            status: "success",
                                                            message:
                                                                "You have successfully liked this song.",
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            } else
                                return cb({
                                    status: "failure",
                                    message:
                                        "Something went wrong while liking this song.",
                                });
                        }
                    );
                });
            }
        );
    }),

    /**
     * Dislikes a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    dislike: hooks.loginRequired(async (session, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId }, next);
                },

                (song, next) => {
                    if (!song) return next("No song found with that id.");
                    next(null, song);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_DISLIKE",
                        `User "${session.userId}" failed to like song ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                let oldSongId = songId;
                songId = song._id;
                userModel.findOne({ _id: session.userId }, (err, user) => {
                    if (user.disliked.indexOf(songId) !== -1)
                        return cb({
                            status: "failure",
                            message: "You have already disliked this song.",
                        });
                    userModel.updateOne(
                        { _id: session.userId },
                        {
                            $push: { disliked: songId },
                            $pull: { liked: songId },
                        },
                        (err) => {
                            if (!err) {
                                userModel.countDocuments(
                                    { liked: songId },
                                    (err, likes) => {
                                        if (err)
                                            return cb({
                                                status: "failure",
                                                message:
                                                    "Something went wrong while disliking this song.",
                                            });
                                        userModel.countDocuments(
                                            { disliked: songId },
                                            (err, dislikes) => {
                                                if (err)
                                                    return cb({
                                                        status: "failure",
                                                        message:
                                                            "Something went wrong while disliking this song.",
                                                    });
                                                songModel.update(
                                                    { _id: songId },
                                                    {
                                                        $set: {
                                                            likes: likes,
                                                            dislikes: dislikes,
                                                        },
                                                    },
                                                    (err, res) => {
                                                        if (err)
                                                            return cb({
                                                                status:
                                                                    "failure",
                                                                message:
                                                                    "Something went wrong while disliking this song.",
                                                            });
                                                        songs.runJob(
                                                            "UPDATE_SONG",
                                                            { songId }
                                                        );
                                                        cache.runJob("PUB", {
                                                            channel:
                                                                "song.dislike",
                                                            value: JSON.stringify(
                                                                {
                                                                    songId: oldSongId,
                                                                    userId:
                                                                        session.userId,
                                                                    likes: likes,
                                                                    dislikes: dislikes,
                                                                }
                                                            ),
                                                        });
                                                        return cb({
                                                            status: "success",
                                                            message:
                                                                "You have successfully disliked this song.",
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            } else
                                return cb({
                                    status: "failure",
                                    message:
                                        "Something went wrong while disliking this song.",
                                });
                        }
                    );
                });
            }
        );
    }),

    /**
     * Undislikes a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    undislike: hooks.loginRequired(async (session, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId }, next);
                },

                (song, next) => {
                    if (!song) return next("No song found with that id.");
                    next(null, song);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_UNDISLIKE",
                        `User "${session.userId}" failed to like song ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                let oldSongId = songId;
                songId = song._id;
                userModel.findOne({ _id: session.userId }, (err, user) => {
                    if (user.disliked.indexOf(songId) === -1)
                        return cb({
                            status: "failure",
                            message: "You have not disliked this song.",
                        });
                    userModel.updateOne(
                        { _id: session.userId },
                        { $pull: { liked: songId, disliked: songId } },
                        (err) => {
                            if (!err) {
                                userModel.countDocuments(
                                    { liked: songId },
                                    (err, likes) => {
                                        if (err)
                                            return cb({
                                                status: "failure",
                                                message:
                                                    "Something went wrong while undisliking this song.",
                                            });
                                        userModel.countDocuments(
                                            { disliked: songId },
                                            (err, dislikes) => {
                                                if (err)
                                                    return cb({
                                                        status: "failure",
                                                        message:
                                                            "Something went wrong while undisliking this song.",
                                                    });
                                                songModel.update(
                                                    { _id: songId },
                                                    {
                                                        $set: {
                                                            likes: likes,
                                                            dislikes: dislikes,
                                                        },
                                                    },
                                                    (err) => {
                                                        if (err)
                                                            return cb({
                                                                status:
                                                                    "failure",
                                                                message:
                                                                    "Something went wrong while undisliking this song.",
                                                            });
                                                        songs.runJob(
                                                            "UPDATE_SONG",
                                                            { songId }
                                                        );
                                                        cache.runJob("PUB", {
                                                            channel:
                                                                "song.undislike",
                                                            value: JSON.stringify(
                                                                {
                                                                    songId: oldSongId,
                                                                    userId:
                                                                        session.userId,
                                                                    likes: likes,
                                                                    dislikes: dislikes,
                                                                }
                                                            ),
                                                        });
                                                        return cb({
                                                            status: "success",
                                                            message:
                                                                "You have successfully undisliked this song.",
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            } else
                                return cb({
                                    status: "failure",
                                    message:
                                        "Something went wrong while undisliking this song.",
                                });
                        }
                    );
                });
            }
        );
    }),

    /**
     * Unlikes a song
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    unlike: hooks.loginRequired(async (session, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId }, next);
                },

                (song, next) => {
                    if (!song) return next("No song found with that id.");
                    next(null, song);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_UNLIKE",
                        `User "${session.userId}" failed to like song ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                let oldSongId = songId;
                songId = song._id;
                userModel.findOne({ _id: session.userId }, (err, user) => {
                    if (user.liked.indexOf(songId) === -1)
                        return cb({
                            status: "failure",
                            message: "You have not liked this song.",
                        });
                    userModel.updateOne(
                        { _id: session.userId },
                        { $pull: { liked: songId, disliked: songId } },
                        (err) => {
                            if (!err) {
                                userModel.countDocuments(
                                    { liked: songId },
                                    (err, likes) => {
                                        if (err)
                                            return cb({
                                                status: "failure",
                                                message:
                                                    "Something went wrong while unliking this song.",
                                            });
                                        userModel.countDocuments(
                                            { disliked: songId },
                                            (err, dislikes) => {
                                                if (err)
                                                    return cb({
                                                        status: "failure",
                                                        message:
                                                            "Something went wrong while undiking this song.",
                                                    });
                                                songModel.updateOne(
                                                    { _id: songId },
                                                    {
                                                        $set: {
                                                            likes: likes,
                                                            dislikes: dislikes,
                                                        },
                                                    },
                                                    (err) => {
                                                        if (err)
                                                            return cb({
                                                                status:
                                                                    "failure",
                                                                message:
                                                                    "Something went wrong while unliking this song.",
                                                            });
                                                        songs.runJob(
                                                            "UPDATE_SONG",
                                                            { songId }
                                                        );
                                                        cache.runJob("PUB", {
                                                            channel:
                                                                "song.unlike",
                                                            value: JSON.stringify(
                                                                {
                                                                    songId: oldSongId,
                                                                    userId:
                                                                        session.userId,
                                                                    likes: likes,
                                                                    dislikes: dislikes,
                                                                }
                                                            ),
                                                        });
                                                        return cb({
                                                            status: "success",
                                                            message:
                                                                "You have successfully unliked this song.",
                                                        });
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );
                            } else
                                return cb({
                                    status: "failure",
                                    message:
                                        "Something went wrong while unliking this song.",
                                });
                        }
                    );
                });
            }
        );
    }),

    /**
     * Gets user's own song ratings
     *
     * @param session
     * @param songId - the song id
     * @param cb
     */
    getOwnSongRatings: hooks.loginRequired(async (session, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId }, next);
                },

                (song, next) => {
                    if (!song) return next("No song found with that id.");
                    next(null, song);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "SONGS_GET_OWN_RATINGS",
                        `User "${session.userId}" failed to get ratings for ${songId}. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                let newSongId = song._id;
                userModel.findOne(
                    { _id: session.userId },
                    async (err, user) => {
                        if (!err && user) {
                            return cb({
                                status: "success",
                                songId: songId,
                                liked: user.liked.indexOf(newSongId) !== -1,
                                disliked:
                                    user.disliked.indexOf(newSongId) !== -1,
                            });
                        } else {
                            return cb({
                                status: "failure",
                                message: await utils.runJob("GET_ERROR", {
                                    error: err,
                                }),
                            });
                        }
                    }
                );
            }
        );
    }),
};
