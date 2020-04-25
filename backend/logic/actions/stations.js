"use strict";

const async = require("async"),
    request = require("request"),
    config = require("config"),
    _ = require("underscore")._;

const hooks = require("./hooks");

const db = require("../db");
const cache = require("../cache");
const notifications = require("../notifications");
const utils = require("../utils");
const stations = require("../stations");
const songs = require("../songs");
const activities = require("../activities");

// const logger = moduleManager.modules["logger"];

let userList = {};
let usersPerStation = {};
let usersPerStationCount = {};

// Temporarily disabled until the messages in console can be limited
// setInterval(async () => {
//     let stationsCountUpdated = [];
//     let stationsUpdated = [];

//     let oldUsersPerStation = usersPerStation;
//     usersPerStation = {};

//     let oldUsersPerStationCount = usersPerStationCount;
//     usersPerStationCount = {};

//     const userModel = await db.runJob("GET_MODEL", {
//         modelName: "user",
//     });
//
//     async.each(
//         Object.keys(userList),
//         function(socketId, next) {
//             utils.runJob("SOCKET_FROM_SESSION", { socketId }).then((socket) => {
//                 let stationId = userList[socketId];
//                 if (
//                     !socket ||
//                     Object.keys(socket.rooms).indexOf(
//                         `station.${stationId}`
//                     ) === -1
//                 ) {
//                     if (stationsCountUpdated.indexOf(stationId) === -1)
//                         stationsCountUpdated.push(stationId);
//                     if (stationsUpdated.indexOf(stationId) === -1)
//                         stationsUpdated.push(stationId);
//                     delete userList[socketId];
//                     return next();
//                 }
//                 if (!usersPerStationCount[stationId])
//                     usersPerStationCount[stationId] = 0;
//                 usersPerStationCount[stationId]++;
//                 if (!usersPerStation[stationId])
//                     usersPerStation[stationId] = [];

//                 async.waterfall(
//                     [
//                         (next) => {
//                             if (!socket.session || !socket.session.sessionId)
//                                 return next("No session found.");
//                             cache
//                                 .runJob("HGET", {
//                                     table: "sessions",
//                                     key: socket.session.sessionId,
//                                 })
//                                 .then((session) => next(null, session))
//                                 .catch(next);
//                         },

//                         (session, next) => {
//                             if (!session) return next("Session not found.");
//                             userModel.findOne({ _id: session.userId }, next);
//                         },

//                         (user, next) => {
//                             if (!user) return next("User not found.");
//                             if (
//                                 usersPerStation[stationId].indexOf(
//                                     user.username
//                                 ) !== -1
//                             )
//                                 return next("User already in the list.");
//                             next(null, user.username);
//                         },
//                     ],
//                     (err, username) => {
//                         if (!err) {
//                             usersPerStation[stationId].push(username);
//                         }
//                         next();
//                     }
//                 );
//             });
//             //TODO Code to show users
//         },
//         (err) => {
//             for (let stationId in usersPerStationCount) {
//                 if (
//                     oldUsersPerStationCount[stationId] !==
//                     usersPerStationCount[stationId]
//                 ) {
//                     if (stationsCountUpdated.indexOf(stationId) === -1)
//                         stationsCountUpdated.push(stationId);
//                 }
//             }

//             for (let stationId in usersPerStation) {
//                 if (
//                     _.difference(
//                         usersPerStation[stationId],
//                         oldUsersPerStation[stationId]
//                     ).length > 0 ||
//                     _.difference(
//                         oldUsersPerStation[stationId],
//                         usersPerStation[stationId]
//                     ).length > 0
//                 ) {
//                     if (stationsUpdated.indexOf(stationId) === -1)
//                         stationsUpdated.push(stationId);
//                 }
//             }

//             stationsCountUpdated.forEach((stationId) => {
//                 //console.log("INFO", "UPDATE_STATION_USER_COUNT", `Updating user count of ${stationId}.`);
//                 cache.runJob("PUB", {
//                     table: "station.updateUserCount",
//                     value: stationId,
//                 });
//             });

//             stationsUpdated.forEach((stationId) => {
//                 //console.log("INFO", "UPDATE_STATION_USER_LIST", `Updating user list of ${stationId}.`);
//                 cache.runJob("PUB", {
//                     table: "station.updateUsers",
//                     value: stationId,
//                 });
//             });

//             //console.log("Userlist", usersPerStation);
//         }
//     );
// }, 3000);

cache.runJob("SUB", {
    channel: "station.updateUsers",
    cb: (stationId) => {
        let list = usersPerStation[stationId] || [];
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${stationId}`,
            args: ["event:users.updated", list],
        });
    },
});

cache.runJob("SUB", {
    channel: "station.updateUserCount",
    cb: (stationId) => {
        let count = usersPerStationCount[stationId] || 0;
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${stationId}`,
            args: ["event:userCount.updated", count],
        });
        stations.runJob("GET_STATION", { stationId }).then(async (station) => {
            if (station.privacy === "public")
                utils.runJob("EMIT_TO_ROOM", {
                    room: "home",
                    args: ["event:userCount.updated", stationId, count],
                });
            else {
                let sockets = await utils.runJob("GET_ROOM_SOCKETS", {
                    room: "home",
                });
                for (let socketId in sockets) {
                    let socket = sockets[socketId];
                    let session = sockets[socketId].session;
                    if (session.sessionId) {
                        cache
                            .runJob("HGET", {
                                table: "sessions",
                                key: session.sessionId,
                            })
                            .then((session) => {
                                if (session)
                                    db.runJob("GET_MODEL", {
                                        modelName: "user",
                                    }).then((userModel) =>
                                        userModel.findOne(
                                            { _id: session.userId },
                                            (err, user) => {
                                                if (user.role === "admin")
                                                    socket.emit(
                                                        "event:userCount.updated",
                                                        stationId,
                                                        count
                                                    );
                                                else if (
                                                    station.type ===
                                                        "community" &&
                                                    station.owner ===
                                                        session.userId
                                                )
                                                    socket.emit(
                                                        "event:userCount.updated",
                                                        stationId,
                                                        count
                                                    );
                                            }
                                        )
                                    );
                            });
                    }
                }
            }
        });
    },
});

cache.runJob("SUB", {
    channel: "station.queueLockToggled",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${data.stationId}`,
            args: ["event:queueLockToggled", data.locked],
        });
    },
});

cache.runJob("SUB", {
    channel: "station.updatePartyMode",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${data.stationId}`,
            args: ["event:partyMode.updated", data.partyMode],
        });
    },
});

cache.runJob("SUB", {
    channel: "privatePlaylist.selected",
    cb: (data) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${data.stationId}`,
            args: ["event:privatePlaylist.selected", data.playlistId],
        });
    },
});

cache.runJob("SUB", {
    channel: "station.pause",
    cb: (stationId) => {
        stations.runJob("GET_STATION", { stationId }).then((station) => {
            utils.runJob("EMIT_TO_ROOM", {
                room: `station.${stationId}`,
                args: ["event:stations.pause", { pausedAt: station.pausedAt }],
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "station.resume",
    cb: (stationId) => {
        stations.runJob("GET_STATION", { stationId }).then((station) => {
            utils.runJob("EMIT_TO_ROOM", {
                room: `station.${stationId}`,
                args: [
                    "event:stations.resume",
                    { timePaused: station.timePaused },
                ],
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "station.queueUpdate",
    cb: (stationId) => {
        stations.runJob("GET_STATION", { stationId }).then((station) => {
            utils.runJob("EMIT_TO_ROOM", {
                room: `station.${stationId}`,
                args: ["event:queue.update", station.queue],
            });
        });
    },
});

cache.runJob("SUB", {
    channel: "station.voteSkipSong",
    cb: (stationId) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${stationId}`,
            args: ["event:song.voteSkipSong"],
        });
    },
});

cache.runJob("SUB", {
    channel: "station.remove",
    cb: (stationId) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: `station.${stationId}`,
            args: ["event:stations.remove"],
        });
        utils.runJob("EMIT_TO_ROOM", {
            room: "admin.stations",
            args: ["event:admin.station.removed", stationId],
        });
    },
});

cache.runJob("SUB", {
    channel: "station.create",
    cb: async (stationId) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });

        stations
            .runJob("INITIALIZE_STATION", { stationId })
            .then(async (response) => {
                const station = response.station;
                station.userCount = usersPerStationCount[stationId] || 0;
                utils.runJob("EMIT_TO_ROOM", {
                    room: "admin.stations",
                    args: ["event:admin.station.added", station],
                });
                // TODO If community, check if on whitelist
                if (station.privacy === "public")
                    utils.runJob("EMIT_TO_ROOM", {
                        room: "home",
                        args: ["event:stations.created", station],
                    });
                else {
                    let sockets = await utils.runJob("GET_ROOM_SOCKETS", {
                        room: "home",
                    });
                    for (let socketId in sockets) {
                        let socket = sockets[socketId];
                        let session = sockets[socketId].session;
                        if (session.sessionId) {
                            cache
                                .runJob("HGET", {
                                    table: "sessions",
                                    key: session.sessionId,
                                })
                                .then((session) => {
                                    if (session) {
                                        userModel.findOne(
                                            { _id: session.userId },
                                            (err, user) => {
                                                if (user.role === "admin")
                                                    socket.emit(
                                                        "event:stations.created",
                                                        station
                                                    );
                                                else if (
                                                    station.type ===
                                                        "community" &&
                                                    station.owner ===
                                                        session.userId
                                                )
                                                    socket.emit(
                                                        "event:stations.created",
                                                        station
                                                    );
                                            }
                                        );
                                    }
                                });
                        }
                    }
                }
            });
    },
});

module.exports = {
    /**
     * Get a list of all the stations
     *
     * @param session
     * @param cb
     * @return {{ status: String, stations: Array }}
     */
    index: (session, cb) => {
        async.waterfall(
            [
                (next) => {
                    console.log(111);
                    cache
                        .runJob("HGETALL", { table: "stations" })
                        .then((stations) => {
                            next(null, stations);
                        });
                },

                (stations, next) => {
                    console.log(222);

                    let resultStations = [];
                    for (let id in stations) {
                        resultStations.push(stations[id]);
                    }
                    next(null, stations);
                },

                (stationsArray, next) => {
                    console.log(333);

                    let resultStations = [];
                    async.each(
                        stationsArray,
                        (station, next) => {
                            async.waterfall(
                                [
                                    (next) => {
                                        stations
                                            .runJob("CAN_USER_VIEW_STATION", {
                                                station,
                                                userId: session.userId,
                                            })
                                            .then((exists) => {
                                                console.log(444, exists);

                                                next(null, exists);
                                            })
                                            .catch(next);
                                    },
                                ],
                                (err, exists) => {
                                    if (err) console.log(err);
                                    station.userCount =
                                        usersPerStationCount[station._id] || 0;
                                    if (exists) resultStations.push(station);
                                    next();
                                }
                            );
                        },
                        () => {
                            next(null, resultStations);
                        }
                    );
                },
            ],
            async (err, stations) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_INDEX",
                        `Indexing stations failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_INDEX",
                    `Indexing stations successful.`,
                    false
                );
                return cb({ status: "success", stations: stations });
            }
        );
    },

    /**
     * Obtains basic metadata of a station in order to format an activity
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    getStationForActivity: (session, stationId, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_GET_STATION_FOR_ACTIVITY",
                        `Failed to obtain metadata of station ${stationId} for activity formatting. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "STATIONS_GET_STATION_FOR_ACTIVITY",
                        `Obtained metadata of station ${stationId} for activity formatting successfully.`
                    );
                    return cb({
                        status: "success",
                        data: {
                            title: station.displayName,
                            thumbnail: station.currentSong
                                ? station.currentSong.thumbnail
                                : "",
                        },
                    });
                }
            }
        );
    },

    /**
     * Verifies that a station exists
     *
     * @param session
     * @param stationName - the station name
     * @param cb
     */
    existsByName: (session, stationName, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION_BY_NAME", { stationName })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next(null, false);
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((exists) => next(null, exists))
                        .catch(next);
                },
            ],
            async (err, exists) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATION_EXISTS_BY_NAME",
                        `Checking if station "${stationName}" exists failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATION_EXISTS_BY_NAME",
                    `Station "${stationName}" exists successfully.` /*, false*/
                );
                cb({ status: "success", exists });
            }
        );
    },

    /**
     * Gets the official playlist for a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    getPlaylist: (session, stationId, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);

                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (canView) return next(null, station);
                            return next("Insufficient permissions.");
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    else if (station.type !== "official")
                        return next("This is not an official station.");
                    else next();
                },

                (next) => {
                    cache
                        .runJob("HGET", {
                            table: "officialPlaylists",
                            key: stationId,
                        })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },

                (playlist, next) => {
                    if (!playlist) return next("Playlist not found.");
                    next(null, playlist);
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_GET_PLAYLIST",
                        `Getting playlist for station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "STATIONS_GET_PLAYLIST",
                        `Got playlist for station "${stationId}" successfully.`,
                        false
                    );
                    cb({ status: "success", data: playlist.songs });
                }
            }
        );
    },

    /**
     * Joins the station by its name
     *
     * @param session
     * @param stationName - the station name
     * @param cb
     * @return {{ status: String, userCount: Integer }}
     */
    join: (session, stationName, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION_BY_NAME", { stationName })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (!canView) next("Not allowed to join station.");
                            else next(null, station);
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },

                (station, next) => {
                    utils.runJob("SOCKET_JOIN_ROOM", {
                        socketId: session.socketId,
                        room: `station.${station._id}`,
                    });
                    let data = {
                        _id: station._id,
                        type: station.type,
                        currentSong: station.currentSong,
                        startedAt: station.startedAt,
                        paused: station.paused,
                        timePaused: station.timePaused,
                        pausedAt: station.pausedAt,
                        description: station.description,
                        displayName: station.displayName,
                        privacy: station.privacy,
                        locked: station.locked,
                        partyMode: station.partyMode,
                        owner: station.owner,
                        privatePlaylist: station.privatePlaylist,
                    };
                    userList[session.socketId] = station._id;
                    next(null, data);
                },

                (data, next) => {
                    data = JSON.parse(JSON.stringify(data));
                    data.userCount = usersPerStationCount[data._id] || 0;
                    data.users = usersPerStation[data._id] || [];
                    if (!data.currentSong || !data.currentSong.title)
                        return next(null, data);
                    utils.runJob("SOCKET_JOIN_SONG_ROOM", {
                        socketId: session.socketId,
                        room: `song.${data.currentSong.songId}`,
                    });
                    data.currentSong.skipVotes =
                        data.currentSong.skipVotes.length;
                    songs
                        .runJob("GET_SONG_FROM_ID", {
                            songId: data.currentSong.songId,
                        })
                        .then((response) => {
                            const song = response.song;
                            if (song) {
                                data.currentSong.likes = song.likes;
                                data.currentSong.dislikes = song.dislikes;
                            } else {
                                data.currentSong.likes = -1;
                                data.currentSong.dislikes = -1;
                            }
                        })
                        .catch((err) => {
                            data.currentSong.likes = -1;
                            data.currentSong.dislikes = -1;
                        })
                        .finally(() => {
                            next(null, data);
                        });
                },
            ],
            async (err, data) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_JOIN",
                        `Joining station "${stationName}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_JOIN",
                    `Joined station "${data._id}" successfully.`
                );
                cb({ status: "success", data });
            }
        );
    },

    /**
     * Toggles if a station is locked
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    toggleLock: hooks.ownerRequired(async (session, stationId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    stationModel.updateOne(
                        { _id: stationId },
                        { $set: { locked: !station.locked } },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_UPDATE_LOCKED_STATUS",
                        `Toggling the queue lock for station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_LOCKED_STATUS",
                        `Toggled the queue lock for station "${stationId}" successfully to "${station.locked}".`
                    );
                    cache.runJob("PUB", {
                        channel: "station.queueLockToggled",
                        value: {
                            stationId,
                            locked: station.locked,
                        },
                    });
                    return cb({ status: "success", data: station.locked });
                }
            }
        );
    }),

    /**
     * Votes to skip a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    voteSkip: hooks.loginRequired(async (session, stationId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });

        let skipVotes = 0;
        let shouldSkip = false;

        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (canView) return next(null, station);
                            return next("Insufficient permissions.");
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },

                (station, next) => {
                    if (!station.currentSong)
                        return next("There is currently no song to skip.");
                    if (
                        station.currentSong.skipVotes.indexOf(
                            session.userId
                        ) !== -1
                    )
                        return next(
                            "You have already voted to skip this song."
                        );
                    next(null, station);
                },

                (station, next) => {
                    stationModel.updateOne(
                        { _id: stationId },
                        { $push: { "currentSong.skipVotes": session.userId } },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    next(null, station);
                },

                (station, next) => {
                    skipVotes = station.currentSong.skipVotes.length;
                    utils
                        .runJob("GET_ROOM_SOCKETS", {
                            room: `station.${stationId}`,
                        })
                        .then((sockets) => next(null, sockets))
                        .catch(next);
                },

                (sockets, next) => {
                    if (sockets.length <= skipVotes) shouldSkip = true;
                    next();
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_VOTE_SKIP",
                        `Vote skipping station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_VOTE_SKIP",
                    `Vote skipping "${stationId}" successful.`
                );
                cache.runJob("PUB", {
                    channel: "station.voteSkipSong",
                    value: stationId,
                });
                cb({
                    status: "success",
                    message: "Successfully voted to skip the song.",
                });
                if (shouldSkip) stations.runJob("SKIP_STATION", { stationId });
            }
        );
    }),

    /**
     * Force skips a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    forceSkip: hooks.ownerRequired((session, stationId, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    next();
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_FORCE_SKIP",
                        `Force skipping station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                notifications.runJob("UNSCHEDULE", {
                    name: `stations.nextSong?id=${stationId}`,
                });
                stations.runJob("SKIP_STATION", { stationId });
                console.log(
                    "SUCCESS",
                    "STATIONS_FORCE_SKIP",
                    `Force skipped station "${stationId}" successfully.`
                );
                return cb({
                    status: "success",
                    message: "Successfully skipped station.",
                });
            }
        );
    }),

    /**
     * Leaves the user's current station
     *
     * @param session
     * @param stationId
     * @param cb
     * @return {{ status: String, userCount: Integer }}
     */
    leave: (session, stationId, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    next();
                },
            ],
            async (err, userCount) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_LEAVE",
                        `Leaving station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_LEAVE",
                    `Left station "${stationId}" successfully.`
                );
                utils.runJob("SOCKET_LEAVE_ROOMS", { socketId: session });
                delete userList[session.socketId];
                return cb({
                    status: "success",
                    message: "Successfully left station.",
                    userCount,
                });
            }
        );
    },

    /**
     * Updates a station's name
     *
     * @param session
     * @param stationId - the station id
     * @param newName - the new station name
     * @param cb
     */
    updateName: hooks.ownerRequired(async (session, stationId, newName, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stationModel.updateOne(
                        { _id: stationId },
                        { $set: { name: newName } },
                        { runValidators: true },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_UPDATE_NAME",
                        `Updating station "${stationId}" name to "${newName}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_UPDATE_NAME",
                    `Updated station "${stationId}" name to "${newName}" successfully.`
                );
                return cb({
                    status: "success",
                    message: "Successfully updated the name.",
                });
            }
        );
    }),

    /**
     * Updates a station's display name
     *
     * @param session
     * @param stationId - the station id
     * @param newDisplayName - the new station display name
     * @param cb
     */
    updateDisplayName: hooks.ownerRequired(
        async (session, stationId, newDisplayName, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            { $set: { displayName: newDisplayName } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_DISPLAY_NAME",
                            `Updating station "${stationId}" displayName to "${newDisplayName}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_DISPLAY_NAME",
                        `Updated station "${stationId}" displayName to "${newDisplayName}" successfully.`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully updated the display name.",
                    });
                }
            );
        }
    ),

    /**
     * Updates a station's description
     *
     * @param session
     * @param stationId - the station id
     * @param newDescription - the new station description
     * @param cb
     */
    updateDescription: hooks.ownerRequired(
        async (session, stationId, newDescription, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            { $set: { description: newDescription } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_DESCRIPTION",
                            `Updating station "${stationId}" description to "${newDescription}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_DESCRIPTION",
                        `Updated station "${stationId}" description to "${newDescription}" successfully.`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully updated the description.",
                    });
                }
            );
        }
    ),

    /**
     * Updates a station's privacy
     *
     * @param session
     * @param stationId - the station id
     * @param newPrivacy - the new station privacy
     * @param cb
     */
    updatePrivacy: hooks.ownerRequired(
        async (session, stationId, newPrivacy, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            { $set: { privacy: newPrivacy } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_PRIVACY",
                            `Updating station "${stationId}" privacy to "${newPrivacy}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_PRIVACY",
                        `Updated station "${stationId}" privacy to "${newPrivacy}" successfully.`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully updated the privacy.",
                    });
                }
            );
        }
    ),

    /**
     * Updates a station's genres
     *
     * @param session
     * @param stationId - the station id
     * @param newGenres - the new station genres
     * @param cb
     */
    updateGenres: hooks.ownerRequired(
        async (session, stationId, newGenres, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            { $set: { genres: newGenres } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_GENRES",
                            `Updating station "${stationId}" genres to "${newGenres}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_GENRES",
                        `Updated station "${stationId}" genres to "${newGenres}" successfully.`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully updated the genres.",
                    });
                }
            );
        }
    ),

    /**
     * Updates a station's blacklisted genres
     *
     * @param session
     * @param stationId - the station id
     * @param newBlacklistedGenres - the new station blacklisted genres
     * @param cb
     */
    updateBlacklistedGenres: hooks.ownerRequired(
        async (session, stationId, newBlacklistedGenres, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            {
                                $set: {
                                    blacklistedGenres: newBlacklistedGenres,
                                },
                            },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_BLACKLISTED_GENRES",
                            `Updating station "${stationId}" blacklisted genres to "${newBlacklistedGenres}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_BLACKLISTED_GENRES",
                        `Updated station "${stationId}" blacklisted genres to "${newBlacklistedGenres}" successfully.`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully updated the blacklisted genres.",
                    });
                }
            );
        }
    ),

    /**
     * Updates a station's party mode
     *
     * @param session
     * @param stationId - the station id
     * @param newPartyMode - the new station party mode
     * @param cb
     */
    updatePartyMode: hooks.ownerRequired(
        async (session, stationId, newPartyMode, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        stations
                            .runJob("GET_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },

                    (station, next) => {
                        if (!station) return next("Station not found.");
                        if (station.partyMode === newPartyMode)
                            return next(
                                "The party mode was already " +
                                    (newPartyMode ? "enabled." : "disabled.")
                            );
                        stationModel.updateOne(
                            { _id: stationId },
                            { $set: { partyMode: newPartyMode } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_UPDATE_PARTY_MODE",
                            `Updating station "${stationId}" party mode to "${newPartyMode}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_UPDATE_PARTY_MODE",
                        `Updated station "${stationId}" party mode to "${newPartyMode}" successfully.`
                    );
                    cache.runJob("PUB", {
                        channel: "station.updatePartyMode",
                        value: {
                            stationId: stationId,
                            partyMode: newPartyMode,
                        },
                    });
                    stations.runJob("SKIP_STATION", { stationId });
                    return cb({
                        status: "success",
                        message: "Successfully updated the party mode.",
                    });
                }
            );
        }
    ),

    /**
     * Pauses a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    pause: hooks.ownerRequired(async (session, stationId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    if (station.paused)
                        return next("That station was already paused.");
                    stationModel.updateOne(
                        { _id: stationId },
                        { $set: { paused: true, pausedAt: Date.now() } },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_PAUSE",
                        `Pausing station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_PAUSE",
                    `Paused station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "station.pause",
                    value: stationId,
                });
                notifications.runJob("UNSCHEDULE", {
                    name: `stations.nextSong?id=${stationId}`,
                });
                return cb({
                    status: "success",
                    message: "Successfully paused.",
                });
            }
        );
    }),

    /**
     * Resumes a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    resume: hooks.ownerRequired(async (session, stationId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    if (!station.paused)
                        return next("That station is not paused.");
                    station.timePaused += Date.now() - station.pausedAt;
                    stationModel.updateOne(
                        { _id: stationId },
                        {
                            $set: { paused: false },
                            $inc: { timePaused: Date.now() - station.pausedAt },
                        },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_RESUME",
                        `Resuming station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_RESUME",
                    `Resuming station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "station.resume",
                    value: stationId,
                });
                return cb({
                    status: "success",
                    message: "Successfully resumed.",
                });
            }
        );
    }),

    /**
     * Removes a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    remove: hooks.ownerRequired(async (session, stationId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stationModel.deleteOne({ _id: stationId }, (err) =>
                        next(err)
                    );
                },

                (next) => {
                    cache
                        .runJob("HDEL", { table: "stations", key: stationId })
                        .then(next)
                        .catch(next);
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_REMOVE",
                        `Removing station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_REMOVE",
                    `Removing station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "station.remove",
                    value: stationId,
                });
                activities.runJob("ADD_ACTIVITY", {
                    userId: session.userId,
                    activityType: "deleted_station",
                    payload: [stationId],
                });
                return cb({
                    status: "success",
                    message: "Successfully removed.",
                });
            }
        );
    }),

    /**
     * Create a station
     *
     * @param session
     * @param data - the station data
     * @param cb
     */
    create: hooks.loginRequired(async (session, data, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });

        data.name = data.name.toLowerCase();
        let blacklist = [
            "country",
            "edm",
            "musare",
            "hip-hop",
            "rap",
            "top-hits",
            "todays-hits",
            "old-school",
            "christmas",
            "about",
            "support",
            "staff",
            "help",
            "news",
            "terms",
            "privacy",
            "profile",
            "c",
            "community",
            "tos",
            "login",
            "register",
            "p",
            "official",
            "o",
            "trap",
            "faq",
            "team",
            "donate",
            "buy",
            "shop",
            "forums",
            "explore",
            "settings",
            "admin",
            "auth",
            "reset_password",
        ];
        async.waterfall(
            [
                (next) => {
                    if (!data) return next("Invalid data.");
                    next();
                },

                (next) => {
                    stationModel.findOne(
                        {
                            $or: [
                                { name: data.name },
                                {
                                    displayName: new RegExp(
                                        `^${data.displayName}$`,
                                        "i"
                                    ),
                                },
                            ],
                        },
                        next
                    );
                },

                (station, next) => {
                    if (station)
                        return next(
                            "A station with that name or display name already exists."
                        );
                    const {
                        name,
                        displayName,
                        description,
                        genres,
                        playlist,
                        type,
                        blacklistedGenres,
                    } = data;
                    if (type === "official") {
                        userModel.findOne(
                            { _id: session.userId },
                            (err, user) => {
                                if (err) return next(err);
                                if (!user) return next("User not found.");
                                if (user.role !== "admin")
                                    return next("Admin required.");
                                stationModel.create(
                                    {
                                        name,
                                        displayName,
                                        description,
                                        type,
                                        privacy: "private",
                                        playlist,
                                        genres,
                                        blacklistedGenres,
                                        currentSong: stations.defaultSong,
                                    },
                                    next
                                );
                            }
                        );
                    } else if (type === "community") {
                        if (blacklist.indexOf(name) !== -1)
                            return next(
                                "That name is blacklisted. Please use a different name."
                            );
                        stationModel.create(
                            {
                                name,
                                displayName,
                                description,
                                type,
                                privacy: "private",
                                owner: session.userId,
                                queue: [],
                                currentSong: null,
                            },
                            next
                        );
                    }
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_CREATE",
                        `Creating station failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_CREATE",
                    `Created station "${station._id}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "station.create",
                    value: station._id,
                });
                activities.runJob("ADD_ACTIVITY", {
                    userId: session.userId,
                    activityType: "created_station",
                    payload: [station._id],
                });
                return cb({
                    status: "success",
                    message: "Successfully created station.",
                });
            }
        );
    }),

    /**
     * Adds song to station queue
     *
     * @param session
     * @param stationId - the station id
     * @param songId - the song id
     * @param cb
     */
    addToQueue: hooks.loginRequired(async (session, stationId, songId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    if (station.locked) {
                        userModel.findOne(
                            { _id: session.userId },
                            (err, user) => {
                                if (
                                    user.role !== "admin" &&
                                    station.owner !== session.userId
                                )
                                    return next(
                                        "Only owners and admins can add songs to a locked queue."
                                    );
                                else return next(null, station);
                            }
                        );
                    } else {
                        return next(null, station);
                    }
                },

                (station, next) => {
                    if (station.type !== "community")
                        return next("That station is not a community station.");
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (canView) return next(null, station);
                            return next("Insufficient permissions.");
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },

                (station, next) => {
                    if (
                        station.currentSong &&
                        station.currentSong.songId === songId
                    )
                        return next("That song is currently playing.");
                    async.each(
                        station.queue,
                        (queueSong, next) => {
                            if (queueSong.songId === songId)
                                return next(
                                    "That song is already in the queue."
                                );
                            next();
                        },
                        (err) => {
                            next(err, station);
                        }
                    );
                },

                (station, next) => {
                    // songs
                    //     .runJob("GET_SONG", { id: songId })
                    //     .then((song) => {
                    //         if (song) return next(null, song, station);
                    //         else {
                    utils
                        .runJob("GET_SONG_FROM_YOUTUBE", { songId })
                        .then((response) => {
                            const song = response.song;
                            song.artists = [];
                            song.skipDuration = 0;
                            song.likes = -1;
                            song.dislikes = -1;
                            song.thumbnail = "empty";
                            song.explicit = false;
                            next(null, song, station);
                        })
                        .catch((err) => {
                            next(err);
                        });
                    //     }
                    // })
                    // .catch((err) => {
                    //     next(err);
                    // });
                },

                (song, station, next) => {
                    let queue = station.queue;
                    song.requestedBy = session.userId;
                    queue.push(song);

                    let totalDuration = 0;
                    queue.forEach((song) => {
                        totalDuration += song.duration;
                    });
                    if (totalDuration >= 3600 * 3)
                        return next("The max length of the queue is 3 hours.");
                    next(null, song, station);
                },

                (song, station, next) => {
                    let queue = station.queue;
                    if (queue.length === 0) return next(null, song, station);
                    let totalDuration = 0;
                    const userId = queue[queue.length - 1].requestedBy;
                    station.queue.forEach((song) => {
                        if (userId === song.requestedBy) {
                            totalDuration += song.duration;
                        }
                    });

                    if (totalDuration >= 900)
                        return next(
                            "The max length of songs per user is 15 minutes."
                        );
                    next(null, song, station);
                },

                (song, station, next) => {
                    let queue = station.queue;
                    if (queue.length === 0) return next(null, song);
                    let totalSongs = 0;
                    const userId = queue[queue.length - 1].requestedBy;
                    queue.forEach((song) => {
                        if (userId === song.requestedBy) {
                            totalSongs++;
                        }
                    });

                    if (totalSongs <= 2) return next(null, song);
                    if (totalSongs > 3)
                        return next(
                            "The max amount of songs per user is 3, and only 2 in a row is allowed."
                        );
                    if (
                        queue[queue.length - 2].requestedBy !== userId ||
                        queue[queue.length - 3] !== userId
                    )
                        return next(
                            "The max amount of songs per user is 3, and only 2 in a row is allowed."
                        );
                    next(null, song);
                },

                (song, next) => {
                    stationModel.updateOne(
                        { _id: stationId },
                        { $push: { queue: song } },
                        { runValidators: true },
                        next
                    );
                },

                (res, next) => {
                    stations
                        .runJob("UPDATE_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_ADD_SONG_TO_QUEUE",
                        `Adding song "${songId}" to station "${stationId}" queue failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_ADD_SONG_TO_QUEUE",
                    `Added song "${songId}" to station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "station.queueUpdate",
                    value: stationId,
                });
                return cb({
                    status: "success",
                    message: "Successfully added song to queue.",
                });
            }
        );
    }),

    /**
     * Removes song from station queue
     *
     * @param session
     * @param stationId - the station id
     * @param songId - the song id
     * @param cb
     */
    removeFromQueue: hooks.ownerRequired(
        async (session, stationId, songId, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            async.waterfall(
                [
                    (next) => {
                        if (!songId) return next("Invalid song id.");
                        stations
                            .runJob("GET_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },

                    (station, next) => {
                        if (!station) return next("Station not found.");
                        if (station.type !== "community")
                            return next("Station is not a community station.");
                        async.each(
                            station.queue,
                            (queueSong, next) => {
                                if (queueSong.songId === songId)
                                    return next(true);
                                next();
                            },
                            (err) => {
                                if (err === true) return next();
                                next("Song is not currently in the queue.");
                            }
                        );
                    },

                    (next) => {
                        stationModel.updateOne(
                            { _id: stationId },
                            { $pull: { queue: { songId: songId } } },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err, station) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_REMOVE_SONG_TO_QUEUE",
                            `Removing song "${songId}" from station "${stationId}" queue failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_REMOVE_SONG_TO_QUEUE",
                        `Removed song "${songId}" from station "${stationId}" successfully.`
                    );
                    cache.runJob("PUB", {
                        channel: "station.queueUpdate",
                        value: stationId,
                    });
                    return cb({
                        status: "success",
                        message: "Successfully removed song from queue.",
                    });
                }
            );
        }
    ),

    /**
     * Gets the queue from a station
     *
     * @param session
     * @param stationId - the station id
     * @param cb
     */
    getQueue: (session, stationId, cb) => {
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    if (station.type !== "community")
                        return next("Station is not a community station.");
                    next(null, station);
                },

                (station, next) => {
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (canView) return next(null, station);
                            return next("Insufficient permissions.");
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },
            ],
            async (err, station) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "STATIONS_GET_QUEUE",
                        `Getting queue for station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "STATIONS_GET_QUEUE",
                    `Got queue for station "${stationId}" successfully.`
                );
                return cb({
                    status: "success",
                    message: "Successfully got queue.",
                    queue: station.queue,
                });
            }
        );
    },

    /**
     * Selects a private playlist for a station
     *
     * @param session
     * @param stationId - the station id
     * @param playlistId - the private playlist id
     * @param cb
     */
    selectPrivatePlaylist: hooks.ownerRequired(
        async (session, stationId, playlistId, cb) => {
            const stationModel = await db.runJob("GET_MODEL", {
                modelName: "station",
            });
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        stations
                            .runJob("GET_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },

                    (station, next) => {
                        if (!station) return next("Station not found.");
                        if (station.type !== "community")
                            return next("Station is not a community station.");
                        if (station.privatePlaylist === playlistId)
                            return next(
                                "That private playlist is already selected."
                            );
                        playlistModel.findOne({ _id: playlistId }, next);
                    },

                    (playlist, next) => {
                        if (!playlist) return next("Playlist not found.");
                        let currentSongIndex =
                            playlist.songs.length > 0
                                ? playlist.songs.length - 1
                                : 0;
                        stationModel.updateOne(
                            { _id: stationId },
                            {
                                $set: {
                                    privatePlaylist: playlistId,
                                    currentSongIndex: currentSongIndex,
                                },
                            },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        stations
                            .runJob("UPDATE_STATION", { stationId })
                            .then((station) => next(null, station))
                            .catch(next);
                    },
                ],
                async (err, station) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "STATIONS_SELECT_PRIVATE_PLAYLIST",
                            `Selecting private playlist "${playlistId}" for station "${stationId}" failed. "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "STATIONS_SELECT_PRIVATE_PLAYLIST",
                        `Selected private playlist "${playlistId}" for station "${stationId}" successfully.`
                    );
                    notifications.runJob("UNSCHEDULE", {
                        name: `stations.nextSong?id${stationId}`,
                    });
                    if (!station.partyMode)
                        stations.runJob("SKIP_STATION", { stationId });
                    cache.runJob("PUB", {
                        channel: "privatePlaylist.selected",
                        value: {
                            playlistId,
                            stationId,
                        },
                    });
                    return cb({
                        status: "success",
                        message: "Successfully selected playlist.",
                    });
                }
            );
        }
    ),

    favoriteStation: hooks.loginRequired(async (session, stationId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => next(null, station))
                        .catch(next);
                },

                (station, next) => {
                    if (!station) return next("Station not found.");
                    stations
                        .runJob("CAN_USER_VIEW_STATION", {
                            station,
                            userId: session.userId,
                        })
                        .then((canView) => {
                            if (canView) return next();
                            return next("Insufficient permissions.");
                        })
                        .catch((err) => {
                            return next(err);
                        });
                },

                (next) => {
                    userModel.updateOne(
                        { _id: session.userId },
                        { $addToSet: { favoriteStations: stationId } },
                        next
                    );
                },

                (res, next) => {
                    if (res.nModified === 0)
                        return next("The station was already favorited.");
                    next();
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "FAVORITE_STATION",
                        `Favoriting station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "FAVORITE_STATION",
                    `Favorited station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "user.favoritedStation",
                    value: {
                        userId: session.userId,
                        stationId,
                    },
                });
                return cb({
                    status: "success",
                    message: "Succesfully favorited station.",
                });
            }
        );
    }),

    unfavoriteStation: hooks.loginRequired(async (session, stationId, cb) => {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        async.waterfall(
            [
                (next) => {
                    userModel.updateOne(
                        { _id: session.userId },
                        { $pull: { favoriteStations: stationId } },
                        next
                    );
                },

                (res, next) => {
                    if (res.nModified === 0)
                        return next("The station wasn't favorited.");
                    next();
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "UNFAVORITE_STATION",
                        `Unfavoriting station "${stationId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "UNFAVORITE_STATION",
                    `Unfavorited station "${stationId}" successfully.`
                );
                cache.runJob("PUB", {
                    channel: "user.unfavoritedStation",
                    value: {
                        userId: session.userId,
                        stationId,
                    },
                });
                return cb({
                    status: "success",
                    message: "Succesfully unfavorited station.",
                });
            }
        );
    }),
};
