const async = require("async");

const moduleManager = require("../../../index");

const db = require("../../db");
const cache = require("../../cache");
const utils = require("../../utils");
const stations = require("../../stations");

module.exports = function(next) {
    return async function(session, stationId) {
        const userModel = await db.runJob("GET_MODEL", { modelName: "user" });
        let args = [];
        for (let prop in arguments) args.push(arguments[prop]);
        let cb = args[args.length - 1];
        async.waterfall(
            [
                (next) => {
                    cache
                        .runJob("HGET", {
                            table: "sessions",
                            key: session.sessionId,
                        })
                        .then((session) => {
                            next(null, session)
                        })
                        .catch(next);
                },
                (session, next) => {
                    if (!session || !session.userId)
                        return next("Login required.");
                    this.session = session;
                    userModel.findOne({ _id: session.userId }, next);
                },
                (user, next) => {
                    if (!user) return next("Login required.");
                    if (user.role === "admin") return next(true);
                    stations
                        .runJob("GET_STATION", { stationId })
                        .then((station) => {
                            next(null, station);
                        })
                        .catch(next);
                },
                (station, next) => {
                    if (!station) return next("Station not found.");
                    if (
                        station.type === "community" &&
                        station.owner === session.userId
                    )
                        return next(true);
                    next("Invalid permissions.");
                },
            ],
            async (err) => {
                if (err !== true) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "INFO",
                        "OWNER_REQUIRED",
                        `User failed to pass owner required check for station "${stationId}". "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "INFO",
                    "OWNER_REQUIRED",
                    `User "${session.userId}" passed owner required check for station "${stationId}"`,
                    false
                );
                next.apply(null, args);
            }
        );
    };
};
