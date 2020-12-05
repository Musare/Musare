const CoreClass = require("../core.js");

const async = require("async");
const mongoose = require("mongoose");

class SongsModule extends CoreClass {
    constructor() {
        super("songs");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            this.setStage(1);

            this.cache = this.moduleManager.modules["cache"];
            this.db = this.moduleManager.modules["db"];
            this.io = this.moduleManager.modules["io"];
            this.utils = this.moduleManager.modules["utils"];

            const songModel = await this.db.runJob("GET_MODEL", {
                modelName: "song",
            });

            const songSchema = await this.cache.runJob("GET_SCHEMA", {
                schemaName: "song",
            });

            async.waterfall(
                [
                    (next) => {
                        this.setStage(2);
                        this.cache
                            .runJob("HGETALL", { table: "songs" })
                            .then((songs) => {
                                next(null, songs);
                            })
                            .catch(next);
                    },

                    (songs, next) => {
                        this.setStage(3);
                        if (!songs) return next();
                        let songIds = Object.keys(songs);
                        async.each(
                            songIds,
                            (songId, next) => {
                                songModel.findOne({ songId }, (err, song) => {
                                    if (err) next(err);
                                    else if (!song)
                                        this.cache
                                            .runJob("HDEL", {
                                                table: "songs",
                                                key: songId,
                                            })
                                            .then(() => {
                                                next();
                                            })
                                            .catch(next);
                                    else next();
                                });
                            },
                            next
                        );
                    },

                    (next) => {
                        this.setStage(4);
                        songModel.find({}, next);
                    },

                    (songs, next) => {
                        this.setStage(5);
                        async.each(
                            songs,
                            (song, next) => {
                                this.cache
                                    .runJob("HSET", {
                                        table: "songs",
                                        key: song.songId,
                                        value: songSchema(song),
                                    })
                                    .then(() => {
                                        next();
                                    })
                                    .catch(next);
                            },
                            next
                        );
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

    /**
     * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
     *
     * @param {String} id - the id of the song we are trying to get
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_SONG(payload) {
        //id, cb
        return new Promise(async (resolve, reject) => {
            const songModel = await this.db.runJob("GET_MODEL", {
                modelName: "song",
            });

            async.waterfall(
                [
                    (next) => {
                        if (!mongoose.Types.ObjectId.isValid(payload.id))
                            return next("Id is not a valid ObjectId.");
                        this.cache
                            .runJob("HGET", { table: "songs", key: payload.id })
                            .then((song) => {
                                next(null, song);
                            })
                            .catch(next);
                    },

                    (song, next) => {
                        if (song) return next(true, song);
                        songModel.findOne({ _id: payload.id }, next);
                    },

                    (song, next) => {
                        if (song) {
                            this.cache
                                .runJob("HSET", {
                                    table: "songs",
                                    key: payload.id,
                                    value: song,
                                })
                                .then((song) => {
                                    next(null, song);
                                });
                        } else next("Song not found.");
                    },
                ],
                (err, song) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve({ song });
                }
            );
        });
    }

    /**
     * Gets a song by song id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
     *
     * @param {String} songId - the mongo id of the song we are trying to get
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_SONG_FROM_ID(payload) {
        //songId, cb
        return new Promise(async (resolve, reject) => {
            const songModel = await this.db.runJob("GET_MODEL", {
                modelName: "song",
            });
            async.waterfall(
                [
                    (next) => {
                        songModel.findOne({ songId: payload.songId }, next);
                    },
                ],
                (err, song) => {
                    if (err && err !== true) return reject(new Error(err));
                    resolve({ song });
                }
            );
        });
    }

    /**
     * Gets a song from id from Mongo and updates the cache with it
     *
     * @param {String} songId - the id of the song we are trying to update
     * @param {Function} cb - gets called when an error occurred or when the operation was successful
     */
    UPDATE_SONG(payload) {
        //songId, cb
        return new Promise(async (resolve, reject) => {
            const songModel = await this.db.runJob("GET_MODEL", {
                modelName: "song",
            });
            async.waterfall(
                [
                    (next) => {
                        songModel.findOne({ _id: payload.songId }, next);
                    },

                    (song, next) => {
                        if (!song) {
                            this.cache.runJob("HDEL", {
                                table: "songs",
                                key: payload.songId,
                            });
                            return next("Song not found.");
                        }

                        this.cache
                            .runJob("HSET", {
                                table: "songs",
                                key: payload.songId,
                                value: song,
                            })
                            .then((song) => {
                                next(null, song);
                            })
                            .catch(next);
                    },
                ],
                (err, song) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve(song);
                }
            );
        });
    }

    /**
     * Deletes song from id from Mongo and cache
     *
     * @param {String} songId - the id of the song we are trying to delete
     * @param {Function} cb - gets called when an error occurred or when the operation was successful
     */
    DELETE_SONG(payload) {
        //songId, cb
        return new Promise(async (resolve, reject) => {
            const songModel = await this.db.runJob("GET_MODEL", {
                modelName: "song",
            });
            async.waterfall(
                [
                    (next) => {
                        songModel.deleteOne({ songId: payload.songId }, next);
                    },

                    (next) => {
                        this.cache
                            .runJob("HDEL", {
                                table: "songs",
                                key: payload.songId,
                            })
                            .then(() => {
                                next();
                            })
                            .catch(next);
                    },
                ],
                (err) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve();
                }
            );
        });
    }
}

module.exports = new SongsModule();
