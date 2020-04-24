const CoreClass = require("../core.js");

class ActivitiesModule extends CoreClass {
    constructor() {
        super("activities");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.db = this.moduleManager.modules["db"];
            this.io = this.moduleManager.modules["io"];
            this.utils = this.moduleManager.modules["utils"];

            resolve();
        });
    }

    // TODO: Migrate
    ADD_ACTIVITY(payload) {
        //userId, activityType, payload
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        this.db
                            .runJob("GET_MODEL", { modelName: "activity" })
                            .then((res) => {
                                next(null, res);
                            })
                            .catch(next);
                    },
                    (activityModel, next) => {
                        const activity = new activityModel({
                            userId: payload.userId,
                            activityType: payload.activityType,
                            payload: payload.payload,
                        });

                        activity.save((err, activity) => {
                            if (err) return next(err);
                            next(null, activity);
                        });
                    },

                    (activity, next) => {
                        this.utils
                            .runJob("SOCKETS_FROM_USER", {
                                userId: activity.userId,
                            })
                            .then((sockets) =>
                                sockets.forEach((socket) => {
                                    socket.emit(
                                        "event:activity.create",
                                        activity
                                    );
                                })
                            );
                    },
                ],
                (err, activity) => {
                    // cb(err, activity);
                }
            );
        });
    }
}

module.exports = new ActivitiesModule();
