const CoreClass = require("../core.js");

const async = require("async");

class ExampleModule extends CoreClass {
    constructor() {
        super("playlists");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            this.setStage(1);

            this.cache = this.moduleManager.modules["cache"];
            this.db = this.moduleManager.modules["db"];
            this.utils = this.moduleManager.modules["utils"];

            const playlistModel = await this.db.runJob("GET_MODEL", {
                modelName: "playlist",
            });

            const playlistSchema = await this.cache.runJob("GET_SCHEMA", {
                schemaName: "playlist",
            });

            this.setStage(2);

            async.waterfall(
                [
                    (next) => {
                        this.setStage(3);
                        this.cache
                            .runJob("HGETALL", { table: "playlists" })
                            .then((playlists) => next(null, playlists))
                            .catch(next);
                    },

                    (playlists, next) => {
                        this.setStage(4);
                        if (!playlists) return next();
                        let playlistIds = Object.keys(playlists);
                        async.each(
                            playlistIds,
                            (playlistId, next) => {
                                playlistModel.findOne(
                                    { _id: playlistId },
                                    (err, playlist) => {
                                        if (err) next(err);
                                        else if (!playlist) {
                                            this.cache
                                                .runJob("HDEL", {
                                                    table: "playlists",
                                                    key: playlistId,
                                                })
                                                .then(() => next())
                                                .catch(next);
                                        } else next();
                                    }
                                );
                            },
                            next
                        );
                    },

                    (next) => {
                        this.setStage(5);
                        playlistModel.find({}, next);
                    },

                    (playlists, next) => {
                        this.setStage(6);
                        async.each(
                            playlists,
                            (playlist, next) => {
                                this.cache
                                    .runJob("HSET", {
                                        table: "playlists",
                                        key: playlist._id,
                                        value: playlistSchema(playlist),
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
     * Gets a playlist by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
     *
     * @param {String} playlistId - the id of the playlist we are trying to get
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_PLAYLIST(payload) {
        //playlistId, cb
        return new Promise(async (resolve, reject) => {
            const playlistModel = await this.db.runJob("GET_MODEL", {
                modelName: "playlist",
            });

            async.waterfall(
                [
                    (next) => {
                        this.cache
                            .runJob("HGETALL", { table: "playlists" })
                            .then((playlists) => next(null, playlists))
                            .catch(next);
                    },

                    (playlists, next) => {
                        if (!playlists) return next();
                        let playlistIds = Object.keys(playlists);
                        async.each(
                            playlistIds,
                            (playlistId, next) => {
                                playlistModel.findOne(
                                    { _id: playlistId },
                                    (err, playlist) => {
                                        if (err) next(err);
                                        else if (!playlist) {
                                            this.cache
                                                .runJob("HDEL", {
                                                    table: "playlists",
                                                    key: playlistId,
                                                })
                                                .then(() => next())
                                                .catch(next);
                                        } else next();
                                    }
                                );
                            },
                            next
                        );
                    },

                    (next) => {
                        this.cache
                            .runJob("HGET", {
                                table: "playlists",
                                key: payload.playlistId,
                            })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        if (playlist) return next(true, playlist);
                        playlistModel.findOne(
                            { _id: payload.playlistId },
                            next
                        );
                    },

                    (playlist, next) => {
                        if (playlist) {
                            this.cache
                                .runJob("HSET", {
                                    table: "playlists",
                                    key: payload.playlistId,
                                    value: playlist,
                                })
                                .then((playlist) => next(null, playlist))
                                .catch(next);
                        } else next("Playlist not found");
                    },
                ],
                (err, playlist) => {
                    if (err && err !== true) return reject(new Error(err));
                    resolve(playlist);
                }
            );
        });
    }

    /**
     * Gets a playlist from id from Mongo and updates the cache with it
     *
     * @param {String} playlistId - the id of the playlist we are trying to update
     * @param {Function} cb - gets called when an error occurred or when the operation was successful
     */
    UPDATE_PLAYLIST(payload) {
        //playlistId, cb
        return new Promise(async (resolve, reject) => {
            const playlistModel = await this.db.runJob("GET_MODEL", {
                modelName: "playlist",
            });

            async.waterfall(
                [
                    (next) => {
                        playlistModel.findOne(
                            { _id: payload.playlistId },
                            next
                        );
                    },

                    (playlist, next) => {
                        if (!playlist) {
                            this.cache.runJob("HDEL", {
                                table: "playlists",
                                key: payload.playlistId,
                            });
                            return next("Playlist not found");
                        }
                        this.cache
                            .runJob("HSET", {
                                table: "playlists",
                                key: payload.playlistId,
                                value: playlist,
                            })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },
                ],
                (err, playlist) => {
                    if (err && err !== true) return reject(new Error(err));
                    resolve(playlist);
                }
            );
        });
    }

    /**
     * Deletes playlist from id from Mongo and cache
     *
     * @param {String} playlistId - the id of the playlist we are trying to delete
     * @param {Function} cb - gets called when an error occurred or when the operation was successful
     */
    DELETE_PLAYLIST(payload) {
        //playlistId, cb
        return new Promise(async (resolve, reject) => {
            const playlistModel = await this.db.runJob("GET_MODEL", {
                modelName: "playlist",
            });

            async.waterfall(
                [
                    (next) => {
                        playlistModel.deleteOne(
                            { _id: payload.playlistId },
                            next
                        );
                    },

                    (res, next) => {
                        this.cache
                            .runJob("HDEL", {
                                table: "playlists",
                                key: payload.playlistId,
                            })
                            .then(() => next())
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

module.exports = new ExampleModule();
