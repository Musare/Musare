const CoreClass = require("../core.js");

const async = require("async");

let subscription = null;

class StationsModule extends CoreClass {
    constructor() {
        super("stations");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            this.cache = this.moduleManager.modules["cache"];
            this.db = this.moduleManager.modules["db"];
            this.utils = this.moduleManager.modules["utils"];
            this.songs = this.moduleManager.modules["songs"];
            this.notifications = this.moduleManager.modules["notifications"];

            this.defaultSong = {
                songId: "60ItHLz5WEA",
                title: "Faded - Alan Walker",
                duration: 212,
                skipDuration: 0,
                likes: -1,
                dislikes: -1,
            };

            //TEMP
            this.cache.runJob("SUB", {
                channel: "station.pause",
                cb: async (stationId) => {
                    this.notifications
                        .runJob("REMOVE", {
                            subscription: `stations.nextSong?id=${stationId}`,
                        })
                        .then();
                },
            });

            this.cache.runJob("SUB", {
                channel: "station.resume",
                cb: async (stationId) => {
                    this.runJob("INITIALIZE_STATION", { stationId }).then();
                },
            });

            this.cache.runJob("SUB", {
                channel: "station.queueUpdate",
                cb: async (stationId) => {
                    this.runJob("GET_STATION", { stationId }).then(
                        (station) => {
                            if (
                                !station.currentSong &&
                                station.queue.length > 0
                            ) {
                                this.runJob("INITIALIZE_STATION", {
                                    stationId,
                                }).then();
                            }
                        }
                    );
                },
            });

            this.cache.runJob("SUB", {
                channel: "station.newOfficialPlaylist",
                cb: async (stationId) => {
                    this.cache
                        .runJob("HGET", {
                            table: "officialPlaylists",
                            key: stationId,
                        })
                        .then((playlistObj) => {
                            if (playlistObj) {
                                this.utils.emitToRoom(
                                    `station.${stationId}`,
                                    "event:newOfficialPlaylist",
                                    playlistObj.songs
                                );
                            }
                        });
                },
            });

            const stationModel = (this.stationModel = await this.db.runJob(
                "GET_MODEL",
                {
                    modelName: "station",
                }
            ));

            const stationSchema = (this.stationSchema = await this.cache.runJob(
                "GET_SCHEMA",
                {
                    schemaName: "station",
                }
            ));

            async.waterfall(
                [
                    (next) => {
                        this.setStage(2);
                        this.cache
                            .runJob("HGETALL", { table: "stations" })
                            .then((stations) => next(null, stations))
                            .catch(next);
                    },

                    (stations, next) => {
                        this.setStage(3);
                        if (!stations) return next();
                        let stationIds = Object.keys(stations);
                        async.each(
                            stationIds,
                            (stationId, next) => {
                                stationModel.findOne(
                                    { _id: stationId },
                                    (err, station) => {
                                        if (err) next(err);
                                        else if (!station) {
                                            this.cache
                                                .runJob("HDEL", {
                                                    table: "stations",
                                                    key: stationId,
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
                        this.setStage(4);
                        stationModel.find({}, next);
                    },

                    (stations, next) => {
                        this.setStage(5);
                        async.each(
                            [stations[0]],
                            (station, next2) => {
                                async.waterfall(
                                    [
                                        (next) => {
                                            this.cache
                                                .runJob("HSET", {
                                                    table: "stations",
                                                    key: station._id,
                                                    value: stationSchema(
                                                        station
                                                    ),
                                                })
                                                .then((station) =>
                                                    next(null, station)
                                                )
                                                .catch(next);
                                        },

                                        (station, next) => {
                                            this.runJob(
                                                "INITIALIZE_STATION",
                                                {
                                                    stationId: station._id,
                                                    bypassQueue: true,
                                                },
                                                { bypassQueue: true }
                                            )
                                                .then(() => next())
                                                .catch(next); // bypassQueue is true because otherwise the module will never initialize
                                        },
                                    ],
                                    (err) => {
                                        next2(err);
                                    }
                                );
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

    INITIALIZE_STATION(payload) {
        //stationId, cb, bypassValidate = false
        return new Promise((resolve, reject) => {
            // if (typeof cb !== 'function') cb = ()=>{};

            async.waterfall(
                [
                    (next) => {
                        this.runJob(
                            "GET_STATION",
                            { stationId: payload.stationId },
                            { bypassQueue: payload.bypassQueue }
                        )
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                    (station, next) => {
                        if (!station) return next("Station not found.");
                        this.notifications
                            .runJob("UNSCHEDULE", {
                                subscription: `stations.nextSong?id=${station._id}`,
                            })
                            .then()
                            .catch();
                        this.notifications
                            .runJob("SUBSCRIBE", {
                                subscription: `stations.nextSong?id=${station._id}`,
                                cb: () =>
                                    this.runJob("SKIP_STATION", {
                                        stationId: station._id,
                                    }),
                                unique: true,
                                station,
                            })
                            .then()
                            .catch();
                        if (station.paused) return next(true, station);
                        next(null, station);
                    },
                    (station, next) => {
                        if (!station.currentSong) {
                            return this.runJob(
                                "SKIP_STATION",
                                {
                                    stationId: station._id,
                                    bypassQueue: payload.bypassQueue,
                                },
                                { bypassQueue: payload.bypassQueue }
                            )
                                .then((station) => next(true, station))
                                .catch(next)
                                .finally(() => {});
                        }
                        let timeLeft =
                            station.currentSong.duration * 1000 -
                            (Date.now() -
                                station.startedAt -
                                station.timePaused);
                        if (isNaN(timeLeft)) timeLeft = -1;
                        if (
                            station.currentSong.duration * 1000 < timeLeft ||
                            timeLeft < 0
                        ) {
                            this.runJob(
                                "SKIP_STATION",
                                { stationId: station._id },
                                { bypassQueue: payload.bypassQueue }
                            )
                                .then((station) => next(null, station))
                                .catch(next);
                        } else {
                            this.notifications.schedule(
                                `stations.nextSong?id=${station._id}`,
                                timeLeft,
                                null,
                                station
                            );
                            next(null, station);
                        }
                    },
                ],
                async (err, station) => {
                    if (err && err !== true) {
                        err = await this.utils.runJob("GET_ERROR", {
                            error: err,
                        });
                        reject(new Error(err));
                    } else resolve(station);
                }
            );
        });
    }

    CALCULATE_SONG_FOR_STATION(payload) {
        //station, cb, bypassValidate = false
        return new Promise(async (resolve, reject) => {
            const songModel = await db.runJob("GET_MODEL", {
                modelName: "song",
            });
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });

            let songList = [];
            async.waterfall(
                [
                    (next) => {
                        if (payload.station.genres.length === 0) return next();
                        let genresDone = [];
                        payload.station.genres.forEach((genre) => {
                            songModel.find({ genres: genre }, (err, songs) => {
                                if (!err) {
                                    songs.forEach((song) => {
                                        if (songList.indexOf(song._id) === -1) {
                                            let found = false;
                                            song.genres.forEach((songGenre) => {
                                                if (
                                                    payload.station.blacklistedGenres.indexOf(
                                                        songGenre
                                                    ) !== -1
                                                )
                                                    found = true;
                                            });
                                            if (!found) {
                                                songList.push(song._id);
                                            }
                                        }
                                    });
                                }
                                genresDone.push(genre);
                                if (
                                    genresDone.length ===
                                    payload.station.genres.length
                                )
                                    next();
                            });
                        });
                    },

                    (next) => {
                        let playlist = [];
                        songList.forEach(function(songId) {
                            if (payload.station.playlist.indexOf(songId) === -1)
                                playlist.push(songId);
                        });
                        payload.station.playlist.filter((songId) => {
                            if (songList.indexOf(songId) !== -1)
                                playlist.push(songId);
                        });

                        this.utils
                            .runJob("SHUFFLE", { array: playlist })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                        this.utils.shuffle(playlist).then((playlist) => {
                            next(null, playlist);
                        });
                    },

                    (playlist, next) => {
                        this.runJob("CALCULATE_OFFICIAL_PLAYLIST_LIST", {
                            stationId,
                            songList: playlist,
                        })
                            .then(() => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        stationModel.updateOne(
                            { _id: station._id },
                            { $set: { playlist: playlist } },
                            { runValidators: true },
                            (err) => {
                                this.runJob("UPDATE_STATION", {
                                    stationId: station._id,
                                })
                                    .then(() => next(null, playlist))
                                    .catch(next);
                            }
                        );
                    },
                ],
                (err, newPlaylist) => {
                    if (err) return reject(new Error(err));
                    resolve(newPlaylist);
                }
            );
        });
    }

    // Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
    GET_STATION(payload) {
        //stationId, cb, bypassValidate = false
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        this.cache
                            .runJob("HGET", {
                                table: "stations",
                                key: payload.stationId,
                            })
                            .then((station) => next(null, station))
                            .catch(next);
                    },

                    (station, next) => {
                        if (station) return next(true, station);
                        this.stationModel.findOne({ _id: stationId }, next);
                    },

                    (station, next) => {
                        if (station) {
                            if (station.type === "official") {
                                this.runJob(
                                    "CALCULATE_OFFICIAL_PLAYLIST_LIST",
                                    {
                                        stationId: station._id,
                                        songList: station.playlist,
                                    }
                                )
                                    .then()
                                    .catch();
                            }
                            station = this.stationSchema(station);
                            this.cache
                                .runJob("HSET", {
                                    table: "stations",
                                    key: "stationId",
                                    value: station,
                                })
                                .then()
                                .catch();
                            next(true, station);
                        } else next("Station not found");
                    },
                ],
                async (err, station) => {
                    if (err && err !== true) {
                        err = await this.utils.runJob("GET_ERROR", {
                            error: err,
                        });
                        reject(new Error(err));
                    } else resolve(station);
                }
            );
        });
    }

    // Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
    GET_STATION_BY_NAME(payload) {
        //stationName, cb
        return new Promise(async (resolve, reject) => {
            const stationModel = await this.db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.findOne(
                            { name: payload.stationName },
                            next
                        );
                    },

                    (station, next) => {
                        if (station) {
                            if (station.type === "official") {
                                this.runJob(
                                    "CALCULATE_OFFICIAL_PLAYLIST_LIST",
                                    { stationId, songList: playlist }
                                );
                            }
                            this.cache
                                .runJob("GET_SCHEMA", { schemaName: "station" })
                                .then((stationSchema) => {
                                    station = stationSchema(station);
                                    this.cache.runJob("HSET", {
                                        table: "stations",
                                        key: station._id,
                                        value: station,
                                    });
                                    next(true, station);
                                });
                        } else next("Station not found");
                    },
                ],
                (err, station) => {
                    if (err && err !== true) return reject(new Error(err));
                    resolve(station);
                }
            );
        });
    }

    UPDATE_STATION(payload) {
        //stationId, cb, bypassValidate = false
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        this.stationModel.findOne(
                            { _id: payload.stationId },
                            next
                        );
                    },

                    (station, next) => {
                        if (!station) {
                            this.cache
                                .runJob("HDEL", {
                                    table: "stations",
                                    key: payload.stationId,
                                })
                                .then()
                                .catch();
                            return next("Station not found");
                        }
                        this.cache
                            .runJob("HSET", {
                                table: "stations",
                                key: payload.stationId,
                                value: station,
                            })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err, station) => {
                    if (err && err !== true) {
                        err = await this.utils.runJob("GET_ERROR", {
                            error: err,
                        });
                        reject(new Error(err));
                    } else resolve(station);
                }
            );
        });
    }

    CALCULATE_OFFICIAL_PLAYLIST_LIST(payload) {
        //stationId, songList, cb, bypassValidate = false
        return new Promise(async (resolve, reject) => {
            const officialPlaylistSchema = await this.cache.runJob(
                "GET_SCHEMA",
                {
                    schemaName: "officialPlaylist",
                }
            );

            let lessInfoPlaylist = [];
            async.each(
                payload.songList,
                (song, next) => {
                    this.songs
                        .runJob("GET_SONG", { song })
                        .then((song) => {
                            if (song) {
                                let newSong = {
                                    songId: song.songId,
                                    title: song.title,
                                    artists: song.artists,
                                    duration: song.duration,
                                };
                                lessInfoPlaylist.push(newSong);
                            }
                        })
                        .finally(() => {
                            next();
                        });
                },
                () => {
                    this.cache
                        .runJob("HSET", {
                            table: "officialPlaylists",
                            key: payload.stationId,
                            value: officialPlaylistSchema(
                                payload.stationId,
                                lessInfoPlaylist
                            ),
                        })
                        .finally(() => {
                            this.cache.runJob("PUB", {
                                channel: "station.newOfficialPlaylist",
                                value: payload.stationId,
                            });
                            resolve();
                        });
                }
            );
        });
    }

    SKIP_STATION(payload) {
        //stationId
        return new Promise((resolve, reject) => {
            this.log("INFO", `Skipping station ${payload.stationId}.`);

            this.log(
                "STATION_ISSUE",
                `SKIP_STATION_CB - Station ID: ${payload.stationId}.`
            );

            async.waterfall(
                [
                    (next) => {
                        this.runJob(
                            "GET_STATION",
                            {
                                stationId: payload.stationId,
                            },
                            { bypassQueue: payload.bypassQueue }
                        )
                            .then((station) => {
                                next(null, station);
                            })
                            .catch(() => {});
                    },
                    (station, next) => {
                        if (!station) return next("Station not found.");
                        if (
                            station.type === "community" &&
                            station.partyMode &&
                            station.queue.length === 0
                        )
                            return next(null, null, -11, station); // Community station with party mode enabled and no songs in the queue
                        if (
                            station.type === "community" &&
                            station.partyMode &&
                            station.queue.length > 0
                        ) {
                            // Community station with party mode enabled and songs in the queue
                            if (station.paused) {
                                return next(null, null, -19, station);
                            } else {
                                return this.stationModel.updateOne(
                                    { _id: stationId },
                                    {
                                        $pull: {
                                            queue: {
                                                _id: station.queue[0]._id,
                                            },
                                        },
                                    },
                                    (err) => {
                                        if (err) return next(err);
                                        next(
                                            null,
                                            station.queue[0],
                                            -12,
                                            station
                                        );
                                    }
                                );
                            }
                        }
                        if (
                            station.type === "community" &&
                            !station.partyMode
                        ) {
                            this.db
                                .runJob("GET_MODEL", { modelName: "playlist" })
                                .then((playlistModel) => {
                                    return playlistModel.findOne(
                                        { _id: station.privatePlaylist },
                                        (err, playlist) => {
                                            if (err) return next(err);
                                            if (!playlist)
                                                return next(
                                                    null,
                                                    null,
                                                    -13,
                                                    station
                                                );
                                            playlist = playlist.songs;
                                            if (playlist.length > 0) {
                                                let currentSongIndex;
                                                if (
                                                    station.currentSongIndex <
                                                    playlist.length - 1
                                                )
                                                    currentSongIndex =
                                                        station.currentSongIndex +
                                                        1;
                                                else currentSongIndex = 0;
                                                let callback = (err, song) => {
                                                    if (err) return next(err);
                                                    if (song)
                                                        return next(
                                                            null,
                                                            song,
                                                            currentSongIndex,
                                                            station
                                                        );
                                                    else {
                                                        let song =
                                                            playlist[
                                                                currentSongIndex
                                                            ];
                                                        let currentSong = {
                                                            songId: song.songId,
                                                            title: song.title,
                                                            duration:
                                                                song.duration,
                                                            likes: -1,
                                                            dislikes: -1,
                                                        };
                                                        return next(
                                                            null,
                                                            currentSong,
                                                            currentSongIndex,
                                                            station
                                                        );
                                                    }
                                                };
                                                if (
                                                    playlist[currentSongIndex]
                                                        ._id
                                                )
                                                    this.songs
                                                        .runJob("GET_SONG", {
                                                            songId:
                                                                playlist[
                                                                    currentSongIndex
                                                                ]._id,
                                                        })
                                                        .then((song) =>
                                                            callback(null, song)
                                                        )
                                                        .catch(callback);
                                                else
                                                    this.songs
                                                        .runJob(
                                                            "GET_SONG_FROM_ID",
                                                            {
                                                                songId:
                                                                    playlist[
                                                                        currentSongIndex
                                                                    ].songId,
                                                            }
                                                        )
                                                        .then((song) =>
                                                            callback(null, song)
                                                        )
                                                        .catch(callback);
                                            } else
                                                return next(
                                                    null,
                                                    null,
                                                    -14,
                                                    station
                                                );
                                        }
                                    );
                                });
                        }
                        if (
                            station.type === "official" &&
                            station.playlist.length === 0
                        ) {
                            return this.runJob(
                                "CALCULATE_SONG_FOR_STATION",
                                { station, bypassQueue: payload.bypassQueue },
                                { bypassQueue: payload.bypassQueue }
                            )
                                .then((playlist) => {
                                    if (playlist.length === 0)
                                        return next(
                                            null,
                                            this.defaultSong,
                                            0,
                                            station
                                        );
                                    else {
                                        this.songs
                                            .runJob("GET_SONG", {
                                                songId: playlist[0],
                                            })
                                            .then((song) => {
                                                next(null, song, 0, station);
                                            })
                                            .catch((err) => {
                                                return next(
                                                    null,
                                                    this.defaultSong,
                                                    0,
                                                    station
                                                );
                                            });
                                    }
                                })
                                .catch(next);
                        }
                        if (
                            station.type === "official" &&
                            station.playlist.length > 0
                        ) {
                            async.doUntil(
                                (next) => {
                                    if (
                                        station.currentSongIndex <
                                        station.playlist.length - 1
                                    ) {
                                        this.songs
                                            .runJob("GET_SONG", {
                                                songId:
                                                    station.playlist[
                                                        station.currentSongIndex +
                                                            1
                                                    ],
                                            })
                                            .then((song) => {
                                                return next(
                                                    null,
                                                    song,
                                                    station.currentSongIndex + 1
                                                );
                                            })
                                            .catch((err) => {
                                                station.currentSongIndex++;
                                                next(null, null, null);
                                            });
                                    } else {
                                        this.runJob(
                                            "CALCULATE_SONG_FOR_STATION",
                                            {
                                                station,
                                                bypassQueue:
                                                    payload.bypassQueue,
                                            },
                                            { bypassQueue: payload.bypassQueue }
                                        )
                                            .then((newPlaylist) => {
                                                this.songs.getSong(
                                                    newPlaylist[0],
                                                    (err, song) => {
                                                        if (err || !song)
                                                            return next(
                                                                null,
                                                                this
                                                                    .defaultSong,
                                                                0
                                                            );
                                                        station.playlist = newPlaylist;
                                                        next(null, song, 0);
                                                    }
                                                );
                                            })
                                            .catch((err) => {
                                                next(null, this.defaultSong, 0);
                                            });
                                    }
                                },
                                (song, currentSongIndex, next) => {
                                    if (!!song)
                                        return next(
                                            null,
                                            true,
                                            currentSongIndex
                                        );
                                    else return next(null, false);
                                },
                                (err, song, currentSongIndex) => {
                                    return next(
                                        err,
                                        song,
                                        currentSongIndex,
                                        station
                                    );
                                }
                            );
                        }
                    },
                    (song, currentSongIndex, station, next) => {
                        let $set = {};
                        if (song === null) $set.currentSong = null;
                        else if (song.likes === -1 && song.dislikes === -1) {
                            $set.currentSong = {
                                songId: song.songId,
                                title: song.title,
                                duration: song.duration,
                                skipDuration: 0,
                                likes: -1,
                                dislikes: -1,
                            };
                        } else {
                            $set.currentSong = {
                                songId: song.songId,
                                title: song.title,
                                artists: song.artists,
                                duration: song.duration,
                                likes: song.likes,
                                dislikes: song.dislikes,
                                skipDuration: song.skipDuration,
                                thumbnail: song.thumbnail,
                            };
                        }
                        if (currentSongIndex >= 0)
                            $set.currentSongIndex = currentSongIndex;
                        $set.startedAt = Date.now();
                        $set.timePaused = 0;
                        if (station.paused) $set.pausedAt = Date.now();
                        next(null, $set, station);
                    },

                    ($set, station, next) => {
                        this.stationModel.updateOne(
                            { _id: station._id },
                            { $set },
                            (err) => {
                                this.runJob(
                                    "UPDATE_STATION",
                                    {
                                        stationId: station._id,
                                        bypassQueue: payload.bypassQueue,
                                    },
                                    { bypassQueue: payload.bypassQueue }
                                )
                                    .then((station) => {
                                        if (
                                            station.type === "community" &&
                                            station.partyMode === true
                                        )
                                            this.cache
                                                .runJob("PUB", {
                                                    channel:
                                                        "station.queueUpdate",
                                                    value: payload.stationId,
                                                })
                                                .then()
                                                .catch();
                                        next(null, station);
                                    })
                                    .catch(next);
                            }
                        );
                    },
                ],
                async (err, station) => {
                    if (err) {
                        err = await this.utils.runJob("GET_ERROR", {
                            error: err,
                        });
                        this.log(
                            "ERROR",
                            `Skipping station "${payload.stationId}" failed. "${err}"`
                        );
                        reject(new Error(err));
                    } else {
                        if (
                            station.currentSong !== null &&
                            station.currentSong.songId !== undefined
                        ) {
                            station.currentSong.skipVotes = 0;
                        }
                        //TODO Pub/Sub this

                        this.utils
                            .runJob("EMIT_TO_ROOM", {
                                room: `station.${station._id}`,
                                args: [
                                    "event:songs.next",
                                    {
                                        currentSong: station.currentSong,
                                        startedAt: station.startedAt,
                                        paused: station.paused,
                                        timePaused: 0,
                                    },
                                ],
                            })
                            .then()
                            .catch();

                        if (station.privacy === "public") {
                            this.utils
                                .runJob("EMIT_TO_ROOM", {
                                    room: "home",
                                    args: [
                                        "event:station.nextSong",
                                        station._id,
                                        station.currentSong,
                                    ],
                                })
                                .then()
                                .catch();
                        } else {
                            let sockets = await this.utils.getRoomSockets(
                                "home"
                            );
                            for (let socketId in sockets) {
                                let socket = sockets[socketId];
                                let session = sockets[socketId].session;
                                if (session.sessionId) {
                                    this.cache.hget(
                                        "sessions",
                                        session.sessionId,
                                        (err, session) => {
                                            if (!err && session) {
                                                this.db.models.user.findOne(
                                                    { _id: session.userId },
                                                    (err, user) => {
                                                        if (!err && user) {
                                                            if (
                                                                user.role ===
                                                                "admin"
                                                            )
                                                                socket.emit(
                                                                    "event:station.nextSong",
                                                                    station._id,
                                                                    station.currentSong
                                                                );
                                                            else if (
                                                                station.type ===
                                                                    "community" &&
                                                                station.owner ===
                                                                    session.userId
                                                            )
                                                                socket.emit(
                                                                    "event:station.nextSong",
                                                                    station._id,
                                                                    station.currentSong
                                                                );
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    );
                                }
                            }
                        }

                        if (
                            station.currentSong !== null &&
                            station.currentSong.songId !== undefined
                        ) {
                            this.utils.socketsJoinSongRoom(
                                await this.utils.getRoomSockets(
                                    `station.${station._id}`
                                ),
                                `song.${station.currentSong.songId}`
                            );
                            if (!station.paused) {
                                this.notifications.schedule(
                                    `stations.nextSong?id=${station._id}`,
                                    station.currentSong.duration * 1000,
                                    null,
                                    station
                                );
                            }
                        } else {
                            this.utils
                                .runJob("SOCKETS_LEAVE_SONG_ROOMS", {
                                    sockets: await this.utils.runJob(
                                        "GET_ROOM_SOCKETS",
                                        { room: `station.${station._id}` }
                                    ),
                                })
                                .then()
                                .catch();
                        }

                        resolve({ station: station });
                    }
                }
            );
        });
    }

    CAN_USER_VIEW_STATION(payload) {
        // station, userId, cb
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        if (payload.station.privacy !== "private")
                            return next(true);
                        if (!payload.userId) return next("Not allowed");
                        next();
                    },

                    async (next) => {
                        const userModel = await this.db.runJob("GET_MODEL", {
                            modelName: "user",
                        });
                        userModel.findOne({ _id: userId }, next);
                    },

                    (user, next) => {
                        if (!user) return next("Not allowed");
                        if (user.role === "admin") return next(true);
                        if (payload.station.type === "official")
                            return next("Not allowed");
                        if (payload.station.owner === payload.userId)
                            return next(true);
                        next("Not allowed");
                    },
                ],
                async (errOrResult) => {
                    if (errOrResult !== true && err !== "Not allowed") {
                        errOrResult = await this.utils.runJob("GET_ERROR", {
                            error: errOrResult,
                        });
                        reject(new Error(errOrResult));
                    } else {
                        resolve(errOrResult === true ? true : false);
                    }
                }
            );
        });
    }
}

module.exports = new StationsModule();
