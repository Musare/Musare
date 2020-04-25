"use strict";

const async = require("async");

const hooks = require("./hooks");
const moduleManager = require("../../index");

const db = require("../db");
const cache = require("../cache");
const utils = require("../utils");
const playlists = require("../playlists");
const songs = require("../songs");
const activities = require("../activities");

cache.runJob("SUB", {
    channel: "playlist.create",
    cb: (playlistId) => {
        playlists.runJob("GET_PLAYLIST", { playlistId }).then((playlist) => {
            utils
                .runJob("SOCKETS_FROM_USER", { userId: playlist.createdBy })
                .then((response) => {
                    response.sockets.forEach((socket) => {
                        socket.emit("event:playlist.create", playlist);
                    });
                });
        });
    },
});

cache.runJob("SUB", {
    channel: "playlist.delete",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.delete", res.playlistId);
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "playlist.moveSongToTop",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.moveSongToTop", {
                        playlistId: res.playlistId,
                        songId: res.songId,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "playlist.moveSongToBottom",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.moveSongToBottom", {
                        playlistId: res.playlistId,
                        songId: res.songId,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "playlist.addSong",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.addSong", {
                        playlistId: res.playlistId,
                        song: res.song,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "playlist.removeSong",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.removeSong", {
                        playlistId: res.playlistId,
                        songId: res.songId,
                    });
                });
            });
    },
});

cache.runJob("SUB", {
    channel: "playlist.updateDisplayName",
    cb: (res) => {
        utils
            .runJob("SOCKETS_FROM_USER", { userId: res.userId })
            .then((response) => {
                response.sockets.forEach((socket) => {
                    socket.emit("event:playlist.updateDisplayName", {
                        playlistId: res.playlistId,
                        displayName: res.displayName,
                    });
                });
            });
    },
});

let lib = {
    /**
     * Gets the first song from a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are getting the first song from
     * @param {Function} cb - gets called with the result
     */
    getFirstSong: hooks.loginRequired((session, playlistId, cb) => {
        async.waterfall(
            [
                (next) => {
                    playlists
                        .runJob("GET_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },

                (playlist, next) => {
                    if (!playlist || playlist.createdBy !== session.userId)
                        return next("Playlist not found.");
                    next(null, playlist.songs[0]);
                },
            ],
            async (err, song) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_GET_FIRST_SONG",
                        `Getting the first song of playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_GET_FIRST_SONG",
                    `Successfully got the first song of playlist "${playlistId}" for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    song: song,
                });
            }
        );
    }),

    /**
     * Gets all playlists for the user requesting it
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    indexForUser: hooks.loginRequired(async (session, cb) => {
        const playlistModel = await db.runJob("GET_MODEL", {
            modelName: "playlist",
        });
        async.waterfall(
            [
                (next) => {
                    playlistModel.find({ createdBy: session.userId }, next);
                },
            ],
            async (err, playlists) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_INDEX_FOR_USER",
                        `Indexing playlists for user "${session.userId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_INDEX_FOR_USER",
                    `Successfully indexed playlists for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    data: playlists,
                });
            }
        );
    }),

    /**
     * Creates a new private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Object} data - the data for the new private playlist
     * @param {Function} cb - gets called with the result
     */
    create: hooks.loginRequired(async (session, data, cb) => {
        const playlistModel = await db.runJob("GET_MODEL", {
            modelName: "playlist",
        });
        async.waterfall(
            [
                (next) => {
                    return data
                        ? next()
                        : cb({ status: "failure", message: "Invalid data" });
                },

                (next) => {
                    const { displayName, songs } = data;
                    playlistModel.create(
                        {
                            displayName,
                            songs,
                            createdBy: session.userId,
                            createdAt: Date.now(),
                        },
                        next
                    );
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_CREATE",
                        `Creating private playlist failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                cache.runJob("PUB", {
                    channel: "playlist.create",
                    value: playlist._id,
                });
                activities.runJob("ADD_ACTIVITY", {
                    userId: session.userId,
                    activityType: "created_playlist",
                    payload: [playlist._id],
                });
                console.log(
                    "SUCCESS",
                    "PLAYLIST_CREATE",
                    `Successfully created private playlist for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    message: "Successfully created playlist",
                    data: {
                        _id: playlist._id,
                    },
                });
            }
        );
    }),

    /**
     * Gets a playlist from id
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are getting
     * @param {Function} cb - gets called with the result
     */
    getPlaylist: hooks.loginRequired((session, playlistId, cb) => {
        async.waterfall(
            [
                (next) => {
                    playlists
                        .runJob("GET_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },

                (playlist, next) => {
                    if (!playlist || playlist.createdBy !== session.userId)
                        return next("Playlist not found");
                    next(null, playlist);
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_GET",
                        `Getting private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_GET",
                    `Successfully got private playlist "${playlistId}" for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    data: playlist,
                });
            }
        );
    }),

    /**
     * Obtains basic metadata of a playlist in order to format an activity
     *
     * @param session
     * @param playlistId - the playlist id
     * @param cb
     */
    getPlaylistForActivity: (session, playlistId, cb) => {
        async.waterfall(
            [
                (next) => {
                    playlists
                        .runJob("GET_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
                        `Failed to obtain metadata of playlist ${playlistId} for activity formatting. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
                        `Obtained metadata of playlist ${playlistId} for activity formatting successfully.`
                    );
                    cb({
                        status: "success",
                        data: {
                            title: playlist.displayName,
                        },
                    });
                }
            }
        );
    },

    //TODO Remove this
    /**
     * Updates a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are updating
     * @param {Object} playlist - the new private playlist object
     * @param {Function} cb - gets called with the result
     */
    update: hooks.loginRequired(async (session, playlistId, playlist, cb) => {
        const playlistModel = await db.runJob("GET_MODEL", {
            modelName: "playlist",
        });
        async.waterfall(
            [
                (next) => {
                    playlistModel.updateOne(
                        { _id: playlistId, createdBy: session.userId },
                        playlist,
                        { runValidators: true },
                        next
                    );
                },

                (res, next) => {
                    playlists
                        .runJob("UPDATE_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_UPDATE",
                        `Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_UPDATE",
                    `Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    data: playlist,
                });
            }
        );
    }),

    /**
     * Updates a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are updating
     * @param {Function} cb - gets called with the result
     */
    shuffle: hooks.loginRequired(async (session, playlistId, cb) => {
        const playlistModel = await db.runJob("GET_MODEL", {
            modelName: "playlist",
        });
        async.waterfall(
            [
                (next) => {
                    if (!playlistId) return next("No playlist id.");
                    playlistModel.findById(playlistId, next);
                },

                (playlist, next) => {
                    utils
                        .runJob("SHUFFLE", { array: playlist.songs })
                        .then((songs) => next(null, songs))
                        .catch(next);
                },

                (songs, next) => {
                    playlistModel.updateOne(
                        { _id: playlistId },
                        { $set: { songs } },
                        { runValidators: true },
                        next
                    );
                },

                (res, next) => {
                    playlists
                        .runJob("UPDATE_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },
            ],
            async (err, playlist) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_SHUFFLE",
                        `Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_SHUFFLE",
                    `Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
                );
                cb({
                    status: "success",
                    message: "Successfully shuffled playlist.",
                    data: playlist,
                });
            }
        );
    }),

    /**
     * Adds a song to a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Boolean} isSet - is the song part of a set of songs to be added
     * @param {String} songId - the id of the song we are trying to add
     * @param {String} playlistId - the id of the playlist we are adding the song to
     * @param {Function} cb - gets called with the result
     */
    addSongToPlaylist: hooks.loginRequired(
        async (session, isSet, songId, playlistId, cb) => {
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        playlists
                            .runJob("GET_PLAYLIST", { playlistId })
                            .then((playlist) => {
                                if (
                                    !playlist ||
                                    playlist.createdBy !== session.userId
                                )
                                    return next(
                                        "Something went wrong when trying to get the playlist"
                                    );

                                async.each(
                                    playlist.songs,
                                    (song, next) => {
                                        if (song.songId === songId)
                                            return next(
                                                "That song is already in the playlist"
                                            );
                                        next();
                                    },
                                    next
                                );
                            })
                            .catch(next);
                    },
                    (next) => {
                        songs
                            .runJob("GET_SONG", { id: songId })
                            .then((response) => {
                                const song = response.song;
                                next(null, {
                                    _id: song._id,
                                    songId: songId,
                                    title: song.title,
                                    duration: song.duration,
                                });
                            })
                            .catch(() => {
                                utils
                                    .runJob("GET_SONG_FROM_YOUTUBE", { songId })
                                    .then((response) =>
                                        next(null, response.song)
                                    )
                                    .catch(next);
                            });
                    },
                    (newSong, next) => {
                        playlistModel.updateOne(
                            { _id: playlistId },
                            { $push: { songs: newSong } },
                            { runValidators: true },
                            (err) => {
                                if (err) return next(err);
                                playlists
                                    .runJob("UPDATE_PLAYLIST", { playlistId })
                                    .then((playlist) =>
                                        next(null, playlist, newSong)
                                    )
                                    .catch(next);
                            }
                        );
                    },
                ],
                async (err, playlist, newSong) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_ADD_SONG",
                            `Adding song "${songId}" to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "PLAYLIST_ADD_SONG",
                            `Successfully added song "${songId}" to private playlist "${playlistId}" for user "${session.userId}".`
                        );
                        if (!isSet)
                            activities.runJob("ADD_ACTIVITY", {
                                userId: session.userId,
                                activityType: "added_song_to_playlist",
                                payload: [{ songId, playlistId }],
                            });

                        cache.runJob("PUB", {
                            channel: "playlist.addSong",
                            value: {
                                playlistId: playlist._id,
                                song: newSong,
                                userId: session.userId,
                            },
                        });
                        return cb({
                            status: "success",
                            message:
                                "Song has been successfully added to the playlist",
                            data: playlist.songs,
                        });
                    }
                }
            );
        }
    ),

    /**
     * Adds a set of songs to a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} url - the url of the the YouTube playlist
     * @param {String} playlistId - the id of the playlist we are adding the set of songs to
     * @param {Boolean} musicOnly - whether to only add music to the playlist
     * @param {Function} cb - gets called with the result
     */
    addSetToPlaylist: hooks.loginRequired(
        (session, url, playlistId, musicOnly, cb) => {
            let videosInPlaylistTotal = 0;
            let songsInPlaylistTotal = 0;
            let songsSuccess = 0;
            let songsFail = 0;

            let addedSongs = [];

            async.waterfall(
                [
                    (next) => {
                        utils
                            .runJob("GET_PLAYLIST_FROM_YOUTUBE", {
                                url,
                                musicOnly,
                            })
                            .then(
                                (songIds,
                                (otherSongIds) => {
                                    if (otherSongIds) {
                                        videosInPlaylistTotal = songIds.length;
                                        songsInPlaylistTotal =
                                            otherSongIds.length;
                                    } else {
                                        songsInPlaylistTotal = videosInPlaylistTotal =
                                            songIds.length;
                                    }
                                    next(null, songIds);
                                })
                            );
                    },
                    (songIds, next) => {
                        let processed = 0;
                        function checkDone() {
                            if (processed === songIds.length) next();
                        }
                        for (let s = 0; s < songIds.length; s++) {
                            lib.addSongToPlaylist(
                                session,
                                true,
                                songIds[s],
                                playlistId,
                                (res) => {
                                    processed++;
                                    if (res.status === "success") {
                                        addedSongs.push(songIds[s]);
                                        songsSuccess++;
                                    } else songsFail++;
                                    checkDone();
                                }
                            );
                        }
                    },

                    (next) => {
                        playlists
                            .runJob("GET_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        if (!playlist || playlist.createdBy !== session.userId)
                            return next("Playlist not found.");
                        next(null, playlist);
                    },
                ],
                async (err, playlist) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_IMPORT",
                            `Importing a YouTube playlist to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    } else {
                        activities.runJob("ADD_ACTIVITY", {
                            userId: session.userId,
                            activityType: "added_songs_to_playlist",
                            payload: addedSongs,
                        });
                        console.log(
                            "SUCCESS",
                            "PLAYLIST_IMPORT",
                            `Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${session.userId}". Videos in playlist: ${videosInPlaylistTotal}, songs in playlist: ${songsInPlaylistTotal}, songs successfully added: ${songsSuccess}, songs failed: ${songsFail}.`
                        );
                        cb({
                            status: "success",
                            message: "Playlist has been successfully imported.",
                            data: playlist.songs,
                            stats: {
                                videosInPlaylistTotal,
                                songsInPlaylistTotal,
                                songsAddedSuccessfully: songsSuccess,
                                songsFailedToAdd: songsFail,
                            },
                        });
                    }
                }
            );
        }
    ),

    /**
     * Removes a song from a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} songId - the id of the song we are removing from the private playlist
     * @param {String} playlistId - the id of the playlist we are removing the song from
     * @param {Function} cb - gets called with the result
     */
    removeSongFromPlaylist: hooks.loginRequired(
        async (session, songId, playlistId, cb) => {
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        if (!songId || typeof songId !== "string")
                            return next("Invalid song id.");
                        if (!playlistId || typeof playlistId !== "string")
                            return next("Invalid playlist id.");
                        next();
                    },

                    (next) => {
                        playlists
                            .runJob("GET_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        if (!playlist || playlist.createdBy !== session.userId)
                            return next("Playlist not found");
                        playlistModel.updateOne(
                            { _id: playlistId },
                            { $pull: { songs: { songId: songId } } },
                            next
                        );
                    },

                    (res, next) => {
                        playlists
                            .runJob("UPDATE_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },
                ],
                async (err, playlist) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_REMOVE_SONG",
                            `Removing song "${songId}" from private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    } else {
                        console.log(
                            "SUCCESS",
                            "PLAYLIST_REMOVE_SONG",
                            `Successfully removed song "${songId}" from private playlist "${playlistId}" for user "${session.userId}".`
                        );
                        cache.runJob("PUB", {
                            channel: "playlist.removeSong",
                            value: {
                                playlistId: playlist._id,
                                songId: songId,
                                userId: session.userId,
                            },
                        });
                        return cb({
                            status: "success",
                            message:
                                "Song has been successfully removed from playlist",
                            data: playlist.songs,
                        });
                    }
                }
            );
        }
    ),

    /**
     * Updates the displayName of a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are updating the displayName for
     * @param {Function} cb - gets called with the result
     */
    updateDisplayName: hooks.loginRequired(
        async (session, playlistId, displayName, cb) => {
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        playlistModel.updateOne(
                            { _id: playlistId, createdBy: session.userId },
                            { $set: { displayName } },
                            { runValidators: true },
                            next
                        );
                    },

                    (res, next) => {
                        playlists
                            .runJob("UPDATE_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },
                ],
                async (err, playlist) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_UPDATE_DISPLAY_NAME",
                            `Updating display name to "${displayName}" for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "PLAYLIST_UPDATE_DISPLAY_NAME",
                        `Successfully updated display name to "${displayName}" for private playlist "${playlistId}" for user "${session.userId}".`
                    );
                    cache.runJob("PUB", {
                        channel: "playlist.updateDisplayName",
                        value: {
                            playlistId: playlistId,
                            displayName: displayName,
                            userId: session.userId,
                        },
                    });
                    return cb({
                        status: "success",
                        message: "Playlist has been successfully updated",
                    });
                }
            );
        }
    ),

    /**
     * Moves a song to the top of the list in a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are moving the song to the top from
     * @param {String} songId - the id of the song we are moving to the top of the list
     * @param {Function} cb - gets called with the result
     */
    moveSongToTop: hooks.loginRequired(
        async (session, playlistId, songId, cb) => {
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        playlists
                            .runJob("GET_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        if (!playlist || playlist.createdBy !== session.userId)
                            return next("Playlist not found");
                        async.each(
                            playlist.songs,
                            (song, next) => {
                                if (song.songId === songId) return next(song);
                                next();
                            },
                            (err) => {
                                if (err && err.songId) return next(null, err);
                                next("Song not found");
                            }
                        );
                    },

                    (song, next) => {
                        playlistModel.updateOne(
                            { _id: playlistId },
                            { $pull: { songs: { songId } } },
                            (err) => {
                                if (err) return next(err);
                                return next(null, song);
                            }
                        );
                    },

                    (song, next) => {
                        playlistModel.updateOne(
                            { _id: playlistId },
                            {
                                $push: {
                                    songs: {
                                        $each: [song],
                                        $position: 0,
                                    },
                                },
                            },
                            next
                        );
                    },

                    (res, next) => {
                        playlists
                            .runJob("UPDATE_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },
                ],
                async (err, playlist) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_MOVE_SONG_TO_TOP",
                            `Moving song "${songId}" to the top for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "PLAYLIST_MOVE_SONG_TO_TOP",
                        `Successfully moved song "${songId}" to the top for private playlist "${playlistId}" for user "${session.userId}".`
                    );
                    cache.runJob("PUB", {
                        channel: "playlist.moveSongToTop",
                        value: {
                            playlistId,
                            songId,
                            userId: session.userId,
                        },
                    });
                    return cb({
                        status: "success",
                        message: "Playlist has been successfully updated",
                    });
                }
            );
        }
    ),

    /**
     * Moves a song to the bottom of the list in a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are moving the song to the bottom from
     * @param {String} songId - the id of the song we are moving to the bottom of the list
     * @param {Function} cb - gets called with the result
     */
    moveSongToBottom: hooks.loginRequired(
        async (session, playlistId, songId, cb) => {
            const playlistModel = await db.runJob("GET_MODEL", {
                modelName: "playlist",
            });
            async.waterfall(
                [
                    (next) => {
                        playlists
                            .runJob("GET_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },

                    (playlist, next) => {
                        if (!playlist || playlist.createdBy !== session.userId)
                            return next("Playlist not found");
                        async.each(
                            playlist.songs,
                            (song, next) => {
                                if (song.songId === songId) return next(song);
                                next();
                            },
                            (err) => {
                                if (err && err.songId) return next(null, err);
                                next("Song not found");
                            }
                        );
                    },

                    (song, next) => {
                        playlistModel.updateOne(
                            { _id: playlistId },
                            { $pull: { songs: { songId } } },
                            (err) => {
                                if (err) return next(err);
                                return next(null, song);
                            }
                        );
                    },

                    (song, next) => {
                        playlistModel.updateOne(
                            { _id: playlistId },
                            {
                                $push: {
                                    songs: song,
                                },
                            },
                            next
                        );
                    },

                    (res, next) => {
                        playlists
                            .runJob("UPDATE_PLAYLIST", { playlistId })
                            .then((playlist) => next(null, playlist))
                            .catch(next);
                    },
                ],
                async (err, playlist) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        console.log(
                            "ERROR",
                            "PLAYLIST_MOVE_SONG_TO_BOTTOM",
                            `Moving song "${songId}" to the bottom for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                        );
                        return cb({ status: "failure", message: err });
                    }
                    console.log(
                        "SUCCESS",
                        "PLAYLIST_MOVE_SONG_TO_BOTTOM",
                        `Successfully moved song "${songId}" to the bottom for private playlist "${playlistId}" for user "${session.userId}".`
                    );
                    cache.runJob("PUB", {
                        channel: "playlist.moveSongToBottom",
                        value: {
                            playlistId,
                            songId,
                            userId: session.userId,
                        },
                    });
                    return cb({
                        status: "success",
                        message: "Playlist has been successfully updated",
                    });
                }
            );
        }
    ),

    /**
     * Removes a private playlist
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} playlistId - the id of the playlist we are moving the song to the top from
     * @param {Function} cb - gets called with the result
     */
    remove: hooks.loginRequired(async (session, playlistId, cb) => {
        const stationModel = await db.runJob("GET_MODEL", {
            modelName: "station",
        });
        async.waterfall(
            [
                (next) => {
                    playlists
                        .runJob("DELETE_PLAYLIST", { playlistId })
                        .then((playlist) => next(null, playlist))
                        .catch(next);
                },

                (next) => {
                    stationModel.find({ privatePlaylist: playlistId }, next);
                },

                (stations, next) => {
                    async.each(
                        stations,
                        (station, next) => {
                            async.waterfall(
                                [
                                    (next) => {
                                        stationModel.updateOne(
                                            { _id: station._id },
                                            { $set: { privatePlaylist: null } },
                                            { runValidators: true },
                                            next
                                        );
                                    },

                                    (res, next) => {
                                        if (!station.partyMode) {
                                            moduleManager.modules["stations"]
                                                .runJob("UPDATE_STATION", {
                                                    stationId: station._id,
                                                })
                                                .then((station) =>
                                                    next(null, station)
                                                )
                                                .catch(next);
                                            cache.runJob("PUB", {
                                                channel:
                                                    "privatePlaylist.selected",
                                                value: {
                                                    playlistId: null,
                                                    stationId: station._id,
                                                },
                                            });
                                        } else next();
                                    },
                                ],
                                (err) => {
                                    next();
                                }
                            );
                        },
                        (err) => {
                            next();
                        }
                    );
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "PLAYLIST_REMOVE",
                        `Removing private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "PLAYLIST_REMOVE",
                    `Successfully removed private playlist "${playlistId}" for user "${session.userId}".`
                );
                cache.runJob("PUB", {
                    channel: "playlist.delete",
                    value: {
                        userId: session.userId,
                        playlistId,
                    },
                });
                activities.runJob("ADD_ACTIVITY", {
                    userId: session.userId,
                    activityType: "deleted_playlist",
                    payload: [playlistId],
                });
                return cb({
                    status: "success",
                    message: "Playlist successfully removed",
                });
            }
        );
    }),
};

module.exports = lib;
