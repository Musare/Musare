const async = require("async");

const db = require("../../db");
const cache = require("../../cache");
const utils = require("../../utils");

module.exports = function(next) {
    return async function(session) {
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
                            next(null, session);
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
                    if (user.role !== "admin")
                        return next("Insufficient permissions.");
                    next();
                },
            ],
            async (err) => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "INFO",
                        "ADMIN_REQUIRED",
                        `User failed to pass admin required check. "${err}"`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "INFO",
                    "ADMIN_REQUIRED",
                    `User "${session.userId}" passed admin required check.`,
                    false
                );
                next.apply(null, args);
            }
        );
    };
};
