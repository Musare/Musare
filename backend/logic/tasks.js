const CoreClass = require("../core.js");

const tasks = {};

const async = require("async");
const fs = require("fs");

const Timer = require("../classes/Timer.class");

class TasksModule extends CoreClass {
    constructor() {
        super("tasks");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            // return reject(new Error("Not fully migrated yet."));

            this.cache = this.moduleManager.modules["cache"];
            this.stations = this.moduleManager.modules["stations"];
            this.notifications = this.moduleManager.modules["notifications"];
            this.utils = this.moduleManager.modules["utils"];

            //this.createTask("testTask", testTask, 5000, true);

            this.runJob("CREATE_TASK", {
                name: "stationSkipTask",
                fn: this.checkStationSkipTask,
                timeout: 1000 * 60 * 30,
            });

            this.runJob("CREATE_TASK", {
                name: "sessionClearTask",
                fn: this.sessionClearingTask,
                timeout: 1000 * 60 * 60 * 6,
            });

            this.runJob("CREATE_TASK", {
                name: "logFileSizeCheckTask",
                fn: this.logFileSizeCheckTask,
                timeout: 1000 * 60 * 60,
            });

            resolve();
        });
    }

    CREATE_TASK(payload) {
        return new Promise((resolve, reject) => {
            tasks[payload.name] = {
                name: payload.name,
                fn: payload.fn,
                timeout: payload.timeout,
                lastRan: 0,
                timer: null,
            };

            if (!payload.paused) {
                this.runJob("RUN_TASK", { name: payload.name })
                    .then(() => resolve())
                    .catch((err) => reject(err));
            } else resolve();
        });
    }

    PAUSE_TASK(payload) {
        return new Promise((resolve, reject) => {
            if (tasks[payload.name].timer) tasks[name].timer.pause();
            resolve();
        });
    }

    RESUME_TASK(payload) {
        return new Promise((resolve, reject) => {
            tasks[payload.name].timer.resume();
            resolve();
        });
    }

    RUN_TASK(payload) {
        return new Promise((resolve, reject) => {
            const task = tasks[payload.name];
            if (task.timer) task.timer.pause();

            task.fn.apply(this).then(() => {
                task.lastRan = Date.now();
                task.timer = new Timer(
                    () => {
                        this.runJob("RUN_TASK", { name: payload.name });
                    },
                    task.timeout,
                    false
                );

                resolve();
            });
        });
    }

    checkStationSkipTask(callback) {
        return new Promise((resolve, reject) => {
            this.log(
                "INFO",
                "TASK_STATIONS_SKIP_CHECK",
                `Checking for stations to be skipped.`,
                false
            );
            async.waterfall(
                [
                    (next) => {
                        this.cache
                            .runJob("HGETALL", {
                                table: "stations",
                            })
                            .then((response) => {
                                next(null, response);
                            })
                            .catch(next);
                    },
                    (stations, next) => {
                        async.each(
                            stations,
                            (station, next2) => {
                                if (
                                    station.paused ||
                                    !station.currentSong ||
                                    !station.currentSong.title
                                )
                                    return next2();
                                const timeElapsed =
                                    Date.now() -
                                    station.startedAt -
                                    station.timePaused;
                                if (timeElapsed <= station.currentSong.duration)
                                    return next2();
                                else {
                                    this.log(
                                        "ERROR",
                                        "TASK_STATIONS_SKIP_CHECK",
                                        `Skipping ${station._id} as it should have skipped already.`
                                    );
                                    this.stations
                                        .runJob("INITIALIZE_STATION", {
                                            stationId: station._id,
                                        })
                                        .then(() => {
                                            next2();
                                        });
                                }
                            },
                            () => {
                                next();
                            }
                        );
                    },
                ],
                () => {
                    resolve();
                }
            );
        });
    }

    sessionClearingTask() {
        return new Promise((resolve, reject) => {
            this.log(
                "INFO",
                "TASK_SESSION_CLEAR",
                `Checking for sessions to be cleared.`
            );

            async.waterfall(
                [
                    (next) => {
                        this.cache
                            .runJob("HGETALL", {
                                table: "sessions",
                            })
                            .then((sessions) => {
                                next(null, sessions);
                            })
                            .catch(next);
                    },
                    (sessions, next) => {
                        if (!sessions) return next();
                        let keys = Object.keys(sessions);
                        async.each(
                            keys,
                            (sessionId, next2) => {
                                let session = sessions[sessionId];
                                if (
                                    session &&
                                    session.refreshDate &&
                                    Date.now() - session.refreshDate <
                                        60 * 60 * 24 * 30 * 1000
                                )
                                    return next2();
                                if (!session) {
                                    this.log(
                                        "INFO",
                                        "TASK_SESSION_CLEAR",
                                        "Removing an empty session."
                                    );
                                    this.cache
                                        .runJob("HDEL", {
                                            table: "sessions",
                                            key: sessionId,
                                        })
                                        .finally(() => {
                                            next2();
                                        });
                                } else if (!session.refreshDate) {
                                    session.refreshDate = Date.now();
                                    this.cache
                                        .runJob("HSET", {
                                            table: "sessions",
                                            key: sessionId,
                                            value: session,
                                        })
                                        .finally(() => {
                                            next2()
                                        });
                                } else if (
                                    Date.now() - session.refreshDate >
                                    60 * 60 * 24 * 30 * 1000
                                ) {
                                    this.utils
                                        .runJob("SOCKETS_FROM_SESSION_ID", {
                                            sessionId: session.sessionId,
                                        })
                                        .then((response) => {
                                            if (response.sockets.length > 0) {
                                                session.refreshDate = Date.now();
                                                this.cache
                                                    .runJob("HSET", {
                                                        table: "sessions",
                                                        key: sessionId,
                                                        value: session,
                                                    })
                                                    .finally(() => {
                                                        next2();
                                                    });
                                            } else {
                                                this.log(
                                                    "INFO",
                                                    "TASK_SESSION_CLEAR",
                                                    `Removing session ${sessionId} for user ${session.userId} since inactive for 30 days and not currently in use.`
                                                );
                                                this.cache
                                                    .runJob("HDEL", {
                                                        table: "sessions",
                                                        key: session.sessionId,
                                                    })
                                                    .finally(() => {
                                                        next2();
                                                    });
                                            }
                                        });
                                } else {
                                    this.log(
                                        "ERROR",
                                        "TASK_SESSION_CLEAR",
                                        "This should never log."
                                    );
                                    next2();
                                }
                            },
                            () => {
                                next();
                            }
                        );
                    },
                ],
                () => {
                    resolve();
                }
            );
        });
    }

    logFileSizeCheckTask() {
        return new Promise((resolve, reject) => {
            this.log(
                "INFO",
                "TASK_LOG_FILE_SIZE_CHECK",
                `Checking the size for the log files.`
            );
            async.each(
                [
                    "all.log",
                    "debugStation.log",
                    "error.log",
                    "info.log",
                    "success.log",
                ],
                (fileName, next) => {
                    try {
                        const stats = fs.statSync(
                            `${__dirname}/../../log/${fileName}`
                        );
                        const mb = stats.size / 1000000;
                        if (mb > 25) return next(true);
                        else next();
                    } catch(err) {
                        next(err);
                    }
                },
                async (err) => {
                    if (err && err !== true) {
                        err = await this.utils.runJob("GET_ERROR", { error: err });
                        return reject(new Error(err));
                    } else if (err === true) {
                        this.log(
                            "ERROR",
                            "LOGGER_FILE_SIZE_WARNING",
                            "************************************WARNING*************************************"
                        );
                        this.log(
                            "ERROR",
                            "LOGGER_FILE_SIZE_WARNING",
                            "***************ONE OR MORE LOG FILES APPEAR TO BE MORE THAN 25MB****************"
                        );
                        this.log(
                            "ERROR",
                            "LOGGER_FILE_SIZE_WARNING",
                            "****MAKE SURE TO REGULARLY CLEAR UP THE LOG FILES, MANUALLY OR AUTOMATICALLY****"
                        );
                        this.log(
                            "ERROR",
                            "LOGGER_FILE_SIZE_WARNING",
                            "********************************************************************************"
                        );
                    }
                    
                    resolve();
                }
            );
        });
    }
}

module.exports = new TasksModule();
