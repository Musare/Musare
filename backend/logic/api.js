const CoreClass = require("../core.js");

const async = require("async");
const crypto = require("crypto");

class APIModule extends CoreClass {
    constructor() {
        super("api");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.app = this.moduleManager.modules["app"];
            this.stations = this.moduleManager.modules["stations"];
            this.db = this.moduleManager.modules["db"];
            this.cache = this.moduleManager.modules["cache"];
            this.notifications = this.moduleManager.modules["notifications"];

            const actions = require("./actions");

            this.app.runJob("GET_APP", {})
                .then((response) => {
                    response.app.get("/", (req, res) => {
                        res.json({
                            status: "success",
                            message: "Coming Soon",
                        });
                    });

                    response.app.get("/debug_station", async (req, res) => {
                        const responseObject = {};

                        const stationModel = await this.db.runJob(
                            "GET_MODEL",
                            {
                                modelName: "station",
                            }
                        );

                        async.waterfall([
                            next => {
                                stationModel.find({}, next);
                            },

                            (stations, next) => {
                                responseObject.mongo = {
                                    stations
                                };
                                next();
                            },

                            next => {
                                this.cache
                                    .runJob("HGETALL", { table: "stations" })
                                    .then(stations => next(null, stations))
                                    .catch(next);
                            },

                            (stations, next) => {
                                responseObject.redis = {
                                    stations
                                };
                                next();
                            },

                            next => {
                                responseObject.cryptoExamples = {};
                                responseObject.mongo.stations.forEach(station => {
                                    const payloadName = `stations.nextSong?id=${station._id}`;
                                    responseObject.cryptoExamples[station._id] = crypto
                                        .createHash("md5")
                                        .update(`_notification:${payloadName}_`)
                                        .digest("hex")
                                });
                                next();
                            },

                            next => {
                                this.notifications.pub.keys("*", next);
                            },

                            (redisKeys, next) => {
                                responseObject.redis = {
                                    ...redisKeys,
                                    ttl: {}
                                };
                                async.eachLimit(redisKeys, 1, (redisKey, next) => {
                                    this.notifications.pub.ttl(redisKey, (err, ttl) => {
                                        responseObject.redis.ttl[redisKey] = ttl;
                                        next(err);
                                    })
                                }, next);
                            },

                            next => {
                                responseObject.debugLogs = this.moduleManager.debugLogs.stationIssue;
                                next();
                            },

                            next => {
                                responseObject.debugJobs = this.moduleManager.debugJobs;
                                next();
                            }
                        ], (err, response) => {
                            if (err) {
                                console.log(err);
                                return res.json({
                                    error: err,
                                    objectSoFar: responseObject
                                });
                            }

                            res.json(responseObject);
                        });
                    });

                    // Object.keys(actions).forEach(namespace => {
                    //     Object.keys(actions[namespace]).forEach(action => {
                    //         let name = `/${namespace}/${action}`;

                    //         response.app.get(name, (req, res) => {
                    //             actions[namespace][action](null, result => {
                    //                 if (typeof cb === "function")
                    //                     return res.json(result);
                    //             });
                    //         });
                    //     });
                    // });

                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

module.exports = new APIModule();
