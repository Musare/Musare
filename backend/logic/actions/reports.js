"use strict";

const async = require("async");

const hooks = require("./hooks");

const moduleManager = require("../../index");

const db = require("../db");
const cache = require("../cache");
const utils = require("../utils");
// const logger = require("../logger");
const songs = require("../songs");

const reportableIssues = [
    {
        name: "Video",
        reasons: [
            "Doesn't exist",
            "It's private",
            "It's not available in my country",
        ],
    },
    {
        name: "Title",
        reasons: ["Incorrect", "Inappropriate"],
    },
    {
        name: "Duration",
        reasons: [
            "Skips too soon",
            "Skips too late",
            "Starts too soon",
            "Skips too late",
        ],
    },
    {
        name: "Artists",
        reasons: ["Incorrect", "Inappropriate"],
    },
    {
        name: "Thumbnail",
        reasons: ["Incorrect", "Inappropriate", "Doesn't exist"],
    },
];

cache.runJob("SUB", {
    channel: "report.resolve",
    cb: (reportId) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: "admin.reports",
            args: ["event:admin.report.resolved", reportId],
        });
    },
});

cache.runJob("SUB", {
    channel: "report.create",
    cb: (report) => {
        utils.runJob("EMIT_TO_ROOM", {
            room: "admin.reports",
            args: ["event:admin.report.created", report],
        });
    },
});

module.exports = {
    /**
     * Gets all reports
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Function} cb - gets called with the result
     */
    index: hooks.adminRequired(async (session, cb) => {
        const reportModel = await db.runJob("GET_MODEL", {
            modelName: "report",
        });
        async.waterfall(
            [
                (next) => {
                    reportModel
                        .find({ resolved: false })
                        .sort({ released: "desc" })
                        .exec(next);
                },
            ],
            async (err, reports) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REPORTS_INDEX",
                        `Indexing reports failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "REPORTS_INDEX",
                    "Indexing reports successful."
                );
                cb({ status: "success", data: reports });
            }
        );
    }),

    /**
     * Gets a specific report
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} reportId - the id of the report to return
     * @param {Function} cb - gets called with the result
     */
    findOne: hooks.adminRequired(async (session, reportId, cb) => {
        const reportModel = await db.runJob("GET_MODEL", {
            modelName: "report",
        });
        async.waterfall(
            [
                (next) => {
                    reportModel.findOne({ _id: reportId }).exec(next);
                },
            ],
            async (err, report) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REPORTS_FIND_ONE",
                        `Finding report "${reportId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "SUCCESS",
                    "REPORTS_FIND_ONE",
                    `Finding report "${reportId}" successful.`
                );
                cb({ status: "success", data: report });
            }
        );
    }),

    /**
     * Gets all reports for a songId (_id)
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} songId - the id of the song to index reports for
     * @param {Function} cb - gets called with the result
     */
    getReportsForSong: hooks.adminRequired(async (session, songId, cb) => {
        const reportModel = await db.runJob("GET_MODEL", {
            modelName: "report",
        });
        async.waterfall(
            [
                (next) => {
                    reportModel
                        .find({ song: { _id: songId }, resolved: false })
                        .sort({ released: "desc" })
                        .exec(next);
                },

                (reports, next) => {
                    let data = [];
                    for (let i = 0; i < reports.length; i++) {
                        data.push(reports[i]._id);
                    }
                    next(null, data);
                },
            ],
            async (err, data) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "GET_REPORTS_FOR_SONG",
                        `Indexing reports for song "${songId}" failed. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    console.log(
                        "SUCCESS",
                        "GET_REPORTS_FOR_SONG",
                        `Indexing reports for song "${songId}" successful.`
                    );
                    return cb({ status: "success", data });
                }
            }
        );
    }),

    /**
     * Resolves a report
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {String} reportId - the id of the report that is getting resolved
     * @param {Function} cb - gets called with the result
     */
    resolve: hooks.adminRequired(async (session, reportId, cb) => {
        const reportModel = await db.runJob("GET_MODEL", {
            modelName: "report",
        });
        async.waterfall(
            [
                (next) => {
                    reportModel.findOne({ _id: reportId }).exec(next);
                },

                (report, next) => {
                    if (!report) return next("Report not found.");
                    report.resolved = true;
                    report.save((err) => {
                        if (err) next(err.message);
                        else next();
                    });
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REPORTS_RESOLVE",
                        `Resolving report "${reportId}" failed by user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    cache.runJob("PUB", {
                        channel: "report.resolve",
                        value: reportId,
                    });
                    console.log(
                        "SUCCESS",
                        "REPORTS_RESOLVE",
                        `User "${session.userId}" resolved report "${reportId}".`
                    );
                    cb({
                        status: "success",
                        message: "Successfully resolved Report",
                    });
                }
            }
        );
    }),

    /**
     * Creates a new report
     *
     * @param {Object} session - the session object automatically added by socket.io
     * @param {Object} data - the object of the report data
     * @param {Function} cb - gets called with the result
     */
    create: hooks.loginRequired(async (session, data, cb) => {
        const reportModel = await db.runJob("GET_MODEL", {
            modelName: "report",
        });
        const songModel = await db.runJob("GET_MODEL", { modelName: "song" });
        async.waterfall(
            [
                (next) => {
                    songModel.findOne({ songId: data.songId }).exec(next);
                },

                (song, next) => {
                    if (!song) return next("Song not found.");
                    songs
                        .runJob("GET_SONG", { id: song._id })
                        .then((response) => {
                            next(null, response.song);
                        })
                        .catch(next);
                },

                (song, next) => {
                    if (!song) return next("Song not found.");

                    delete data.songId;
                    data.song = {
                        _id: song._id,
                        songId: song.songId,
                    };

                    for (let z = 0; z < data.issues.length; z++) {
                        if (
                            reportableIssues.filter((issue) => {
                                return issue.name == data.issues[z].name;
                            }).length > 0
                        ) {
                            for (let r = 0; r < reportableIssues.length; r++) {
                                if (
                                    reportableIssues[r].reasons.every(
                                        (reason) =>
                                            data.issues[z].reasons.indexOf(
                                                reason
                                            ) < -1
                                    )
                                ) {
                                    return cb({
                                        status: "failure",
                                        message: "Invalid data",
                                    });
                                }
                            }
                        } else
                            return cb({
                                status: "failure",
                                message: "Invalid data",
                            });
                    }

                    next();
                },

                (next) => {
                    let issues = [];

                    for (let r = 0; r < data.issues.length; r++) {
                        if (!data.issues[r].reasons.length <= 0)
                            issues.push(data.issues[r]);
                    }

                    data.issues = issues;

                    next();
                },

                (next) => {
                    data.createdBy = session.userId;
                    data.createdAt = Date.now();
                    reportModel.create(data, next);
                },
            ],
            async (err, report) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "ERROR",
                        "REPORTS_CREATE",
                        `Creating report for "${data.song._id}" failed by user "${session.userId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                } else {
                    cache.runJob("PUB", {
                        channel: "report.create",
                        value: report,
                    });
                    console.log(
                        "SUCCESS",
                        "REPORTS_CREATE",
                        `User "${session.userId}" created report for "${data.songId}".`
                    );
                    return cb({
                        status: "success",
                        message: "Successfully created report",
                    });
                }
            }
        );
    }),
};
