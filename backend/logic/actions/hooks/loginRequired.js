const async = require("async");

const cache = require("../../cache");
const utils = require("../../utils");
// const logger = moduleManager.modules["logger"];

console.log(cache);

module.exports = function(next) {
    return function(session) {
        let args = [];
        for (let prop in arguments) args.push(arguments[prop]);
        let cb = args[args.length - 1];
        async.waterfall(
            [
                next => {
                    cache
                        .runJob("HGET", {
                            table: "sessions",
                            key: session.sessionId
                        })
                        .then(session => next(null, session))
                        .catch(next);
                },
                (session, next) => {
                    if (!session || !session.userId)
                        return next("Login required.");
                    this.session = session;
                    next();
                }
            ],
            async err => {
                if (err) {
                    err = await utils.runJob("GET_ERROR", { error: err });
                    console.log(
                        "LOGIN_REQUIRED",
                        `User failed to pass login required check.`
                    );
                    return cb({ status: "failure", message: err });
                }
                console.log(
                    "LOGIN_REQUIRED",
                    `User "${session.userId}" passed login required check.`,
                    false
                );
                next.apply(null, args);
            }
        );
    };
};
