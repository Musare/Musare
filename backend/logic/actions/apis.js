"use strict";

const request = require("request");
const config = require("config");
const async = require("async");

const hooks = require("./hooks");
// const moduleManager = require("../../index");

const utils = require("../utils");
// const logger = moduleManager.modules["logger"];

module.exports = {
    /**
     * Fetches a list of songs from Youtubes API
     *
     * @param session
     * @param query - the query we'll pass to youtubes api
     * @param cb
     * @return {{ status: String, data: Object }}
     */
    searchYoutube: (session, query, cb) => {
        const params = [
            "part=snippet",
            `q=${encodeURIComponent(query)}`,
            `key=${config.get("apis.youtube.key")}`,
            "type=video",
            "maxResults=15",
        ].join("&");

        async.waterfall(
            [
                (next) => {
                    request(
                        `https://www.googleapis.com/youtube/v3/search?${params}`,
                        next
                    );
                },

                (res, body, next) => {
                    next(null, JSON.parse(body));
                },
            ],
            async (err, data) => {
                console.log(data.error);
                if (err || data.error) {
                    if (!err) err = data.error.message;
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "APIS_SEARCH_YOUTUBE",
                        `Searching youtube failed with query "${query}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "APIS_SEARCH_YOUTUBE",
                    `Searching YouTube successful with query "${query}".`
                );
                return cb({ status: "success", data });
            }
        );
    },

    /**
     * Gets Spotify data
     *
     * @param session
     * @param title - the title of the song
     * @param artist - an artist for that song
     * @param cb
     */
    getSpotifySongs: hooks.adminRequired((session, title, artist, cb) => {
        async.waterfall(
            [
                (next) => {
                    utils
                        .runJob("GET_SONGS_FROM_SPOTIFY", { title, artist })
                        .then((songs) => next(null, songs))
                        .catch(next);
                },
            ],
            (songs) => {
                console.log(
                    "SUCCESS",
                    "APIS_GET_SPOTIFY_SONGS",
                    `User "${session.userId}" got Spotify songs for title "${title}" successfully.`
                );
                cb({ status: "success", songs: songs });
            }
        );
    }),

    /**
     * Gets Discogs data
     *
     * @param session
     * @param query - the query
     * @param cb
     */
    searchDiscogs: hooks.adminRequired((session, query, page, cb) => {
        async.waterfall(
            [
                (next) => {
                    const params = [
                        `q=${encodeURIComponent(query)}`,
                        `per_page=20`,
                        `page=${page}`,
                    ].join("&");

                    const options = {
                        url: `https://api.discogs.com/database/search?${params}`,
                        headers: {
                            "User-Agent": "Request",
                            Authorization: `Discogs key=${config.get(
                                "apis.discogs.client"
                            )}, secret=${config.get("apis.discogs.secret")}`,
                        },
                    };

                    request(options, (err, res, body) => {
                        if (err) next(err);
                        body = JSON.parse(body);
                        next(null, body);
                        if (body.error) next(body.error);
                    });
                },
            ],
            async (err, body) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "APIS_SEARCH_DISCOGS",
                        `Searching discogs failed with query "${query}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "APIS_SEARCH_DISCOGS",
                    `User "${session.userId}" searched Discogs succesfully for query "${query}".`
                );
                cb({
                    status: "success",
                    results: body.results,
                    pages: body.pagination.pages,
                });
            }
        );
    }),

    /**
     * Joins a room
     *
     * @param session
     * @param page - the room to join
     * @param cb
     */
    joinRoom: (session, page, cb) => {
        if (page === "home") {
            utils.runJob("SOCKET_JOIN_ROOM", {
                socketId: session.socketId,
                room: page,
            });
        }
        cb({});
    },

    /**
     * Joins an admin room
     *
     * @param session
     * @param page - the admin room to join
     * @param cb
     */
    joinAdminRoom: hooks.adminRequired((session, page, cb) => {
        if (
            page === "queue" ||
            page === "songs" ||
            page === "stations" ||
            page === "reports" ||
            page === "news" ||
            page === "users" ||
            page === "statistics" ||
            page === "punishments"
        ) {
            utils.runJob("SOCKET_JOIN_ROOM", {
                socketId: session.socketId,
                room: `admin.${page}`,
            });
        }
        cb({});
    }),

    /**
     * Returns current date
     *
     * @param session
     * @param cb
     */
    ping: (session, cb) => {
        cb({ date: Date.now() });
    },
};
