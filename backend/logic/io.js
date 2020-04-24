const CoreClass = require("../core.js");

const socketio = require("socket.io");
const async = require("async");
const config = require("config");

class IOModule extends CoreClass {
    constructor() {
        super("io");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            this.setStage(1);

            const app = this.moduleManager.modules["app"],
                cache = this.moduleManager.modules["cache"],
                utils = this.moduleManager.modules["utils"],
                db = this.moduleManager.modules["db"],
                punishments = this.moduleManager.modules["punishments"];

            const actions = require("./actions");

            this.setStage(2);

            const SIDname = config.get("cookie.SIDname");

            // TODO: Check every 30s/60s, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
            this._io = socketio(await app.runJob("SERVER", {}));

            this.setStage(3);

            this._io.use(async (socket, next) => {
                if (this.getStatus() !== "READY") {
                    this.log(
                        "INFO",
                        "IO_REJECTED_CONNECTION",
                        `A user tried to connect, but the IO module is currently not ready. IP: ${socket.ip}.${sessionInfo}`
                    );
                    return socket.disconnect(true);
                }

                let SID;

                socket.ip =
                    socket.request.headers["x-forwarded-for"] || "0.0.0.0";

                async.waterfall(
                    [
                        (next) => {
                            utils
                                .runJob("PARSE_COOKIES", {
                                    cookieString: socket.request.headers.cookie,
                                })
                                .then((res) => {
                                    SID = res[SIDname];
                                    next(null);
                                });
                        },

                        (next) => {
                            if (!SID) return next("No SID.");
                            next();
                        },

                        (next) => {
                            cache
                                .runJob("HGET", { table: "sessions", key: SID })
                                .then((session) => {
                                    next(null, session);
                                });
                        },

                        (session, next) => {
                            if (!session) return next("No session found.");

                            session.refreshDate = Date.now();

                            socket.session = session;
                            cache
                                .runJob("HSET", {
                                    table: "sessions",
                                    key: SID,
                                    value: session,
                                })
                                .then((session) => {
                                    next(null, session);
                                });
                        },

                        (res, next) => {
                            // check if a session's user / IP is banned
                            punishments
                                .runJob("GET_PUNISHMENTS", {})
                                .then((punishments) => {
                                    const isLoggedIn = !!(
                                        socket.session &&
                                        socket.session.refreshDate
                                    );
                                    const userId = isLoggedIn
                                        ? socket.session.userId
                                        : null;

                                    let banishment = { banned: false, ban: 0 };

                                    punishments.forEach((punishment) => {
                                        if (
                                            punishment.expiresAt >
                                            banishment.ban
                                        )
                                            banishment.ban = punishment;
                                        if (
                                            punishment.type === "banUserId" &&
                                            isLoggedIn &&
                                            punishment.value === userId
                                        )
                                            banishment.banned = true;
                                        if (
                                            punishment.type === "banUserIp" &&
                                            punishment.value === socket.ip
                                        )
                                            banishment.banned = true;
                                    });

                                    socket.banishment = banishment;

                                    next();
                                })
                                .catch(() => {
                                    next();
                                });
                        },
                    ],
                    () => {
                        if (!socket.session)
                            socket.session = { socketId: socket.id };
                        else socket.session.socketId = socket.id;

                        next();
                    }
                );
            });

            this.setStage(4);

            this._io.on("connection", async (socket) => {
                if (this.getStatus() !== "READY") {
                    this.log(
                        "INFO",
                        "IO_REJECTED_CONNECTION",
                        `A user tried to connect, but the IO module is currently not ready. IP: ${socket.ip}.${sessionInfo}`
                    );
                    return socket.disconnect(true);
                }

                let sessionInfo = "";

                if (socket.session.sessionId)
                    sessionInfo = ` UserID: ${socket.session.userId}.`;

                // if session is banned
                if (socket.banishment && socket.banishment.banned) {
                    this.log(
                        "INFO",
                        "IO_BANNED_CONNECTION",
                        `A user tried to connect, but is currently banned. IP: ${socket.ip}.${sessionInfo}`
                    );
                    socket.emit("keep.event:banned", socket.banishment.ban);
                    socket.disconnect(true);
                } else {
                    this.log(
                        "INFO",
                        "IO_CONNECTION",
                        `User connected. IP: ${socket.ip}.${sessionInfo}`
                    );

                    // catch when the socket has been disconnected
                    socket.on("disconnect", () => {
                        if (socket.session.sessionId)
                            sessionInfo = ` UserID: ${socket.session.userId}.`;
                        this.log(
                            "INFO",
                            "IO_DISCONNECTION",
                            `User disconnected. IP: ${socket.ip}.${sessionInfo}`
                        );
                    });

                    socket.use((data, next) => {
                        if (data.length === 0)
                            return next(
                                new Error("Not enough arguments specified.")
                            );
                        else if (typeof data[0] !== "string")
                            return next(
                                new Error("First argument must be a string.")
                            );
                        else {
                            const namespaceAction = data[0];
                            if (
                                !namespaceAction ||
                                namespaceAction.indexOf(".") === -1 ||
                                namespaceAction.indexOf(".") !==
                                    namespaceAction.lastIndexOf(".")
                            )
                                return next(
                                    new Error("Invalid first argument")
                                );
                            const namespace = data[0].split(".")[0];
                            const action = data[0].split(".")[1];
                            if (!namespace)
                                return next(new Error("Invalid namespace."));
                            else if (!action)
                                return next(new Error("Invalid action."));
                            else if (!actions[namespace])
                                return next(new Error("Namespace not found."));
                            else if (!actions[namespace][action])
                                return next(new Error("Action not found."));
                            else return next();
                        }
                    });

                    // catch errors on the socket (internal to socket.io)
                    socket.on("error", console.error);

                    // have the socket listen for each action
                    Object.keys(actions).forEach((namespace) => {
                        Object.keys(actions[namespace]).forEach((action) => {
                            // the full name of the action
                            let name = `${namespace}.${action}`;

                            // listen for this action to be called
                            socket.on(name, async (...args) => {
                                let cb = args[args.length - 1];
                                if (typeof cb !== "function")
                                    cb = () => {
                                        this.this.log(
                                            "INFO",
                                            "IO_MODULE",
                                            `There was no callback provided for ${name}.`
                                        );
                                    };
                                else args.pop();

                                if (this.getStatus() !== "READY") {
                                    this.log(
                                        "INFO",
                                        "IO_REJECTED_ACTION",
                                        `A user tried to execute an action, but the IO module is currently not ready. Action: ${namespace}.${action}.`
                                    );
                                    return;
                                } else {
                                    this.log(
                                        "INFO",
                                        "IO_ACTION",
                                        `A user executed an action. Action: ${namespace}.${action}.`
                                    );
                                }

                                // load the session from the cache
                                cache
                                    .runJob("HGET", {
                                        table: "sessions",
                                        key: socket.session.sessionId,
                                    })
                                    .then((session) => {
                                        // make sure the sockets sessionId isn't set if there is no session
                                        if (
                                            socket.session.sessionId &&
                                            session === null
                                        )
                                            delete socket.session.sessionId;

                                        try {
                                            // call the action, passing it the session, and the arguments socket.io passed us
                                            actions[namespace][action].apply(
                                                null,
                                                [socket.session]
                                                    .concat(args)
                                                    .concat([
                                                        (result) => {
                                                            // respond to the socket with our message
                                                            if (
                                                                typeof cb ===
                                                                "function"
                                                            )
                                                                return cb(
                                                                    result
                                                                );
                                                        },
                                                    ])
                                            );
                                        } catch (err) {
                                            this.log(
                                                "ERROR",
                                                "IO_ACTION_ERROR",
                                                `Some type of exception occurred in the action ${namespace}.${action}. Error message: ${err.message}`
                                            );
                                            if (typeof cb === "function")
                                                return cb({
                                                    status: "error",
                                                    message:
                                                        "An error occurred while executing the specified action.",
                                                });
                                        }
                                    })
                                    .catch((err) => {
                                        if (typeof cb === "function")
                                            return cb({
                                                status: "error",
                                                message:
                                                    "An error occurred while obtaining your session",
                                            });
                                    });
                            });
                        });
                    });

                    if (socket.session.sessionId) {
                        cache
                            .runJob("HGET", {
                                table: "sessions",
                                key: socket.session.sessionId,
                            })
                            .then((session) => {
                                if (session && session.userId) {
                                    db.runJob("GET_MODEL", {
                                        modelName: "user",
                                    }).then((userModel) => {
                                        userModel.findOne(
                                            { _id: session.userId },
                                            (err, user) => {
                                                if (err || !user)
                                                    return socket.emit(
                                                        "ready",
                                                        false
                                                    );
                                                let role = "";
                                                let username = "";
                                                let userId = "";
                                                if (user) {
                                                    role = user.role;
                                                    username = user.username;
                                                    userId = session.userId;
                                                }
                                                socket.emit(
                                                    "ready",
                                                    true,
                                                    role,
                                                    username,
                                                    userId
                                                );
                                            }
                                        );
                                    });
                                } else socket.emit("ready", false);
                            })
                            .catch((err) => {
                                socket.emit("ready", false);
                            });
                    } else socket.emit("ready", false);
                }
            });

            this.setStage(5);

            resolve();
        });
    }

    IO() {
        return new Promise((resolve, reject) => {
            resolve(this._io);
        });
    }
}

module.exports = new IOModule();
