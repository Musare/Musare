const CoreClass = require("../core.js");

const async = require("async");
const mongoose = require("mongoose");

class PunishmentsModule extends CoreClass {
    constructor() {
        super("punishments");
    }

    initialize() {
        return new Promise(async (resolve, reject) => {
            this.setStage(1);

            this.cache = this.moduleManager.modules["cache"];
            this.db = this.moduleManager.modules["db"];
            this.io = this.moduleManager.modules["io"];
            this.utils = this.moduleManager.modules["utils"];

            const punishmentModel = await this.db.runJob("GET_MODEL", {
                modelName: "punishment",
            });

            const punishmentSchema = await this.cache.runJob("GET_SCHEMA", {
                schemaName: "punishment",
            });

            async.waterfall(
                [
                    (next) => {
                        this.setStage(2);
                        this.cache
                            .runJob("HGETALL", { table: "punishments" })
                            .then((punishments) => next(null, punishments))
                            .catch(next);
                    },

                    (punishments, next) => {
                        this.setStage(3);
                        if (!punishments) return next();
                        let punishmentIds = Object.keys(punishments);
                        async.each(
                            punishmentIds,
                            (punishmentId, next) => {
                                punishmentModel.findOne(
                                    { _id: punishmentId },
                                    (err, punishment) => {
                                        if (err) next(err);
                                        else if (!punishment)
                                            this.cache
                                                .runJob("HDEL", {
                                                    table: "punishments",
                                                    key: punishmentId,
                                                })
                                                .then(() => next())
                                                .catch(next);
                                        else next();
                                    }
                                );
                            },
                            next
                        );
                    },

                    (next) => {
                        this.setStage(4);
                        punishmentModel.find({}, next);
                    },

                    (punishments, next) => {
                        this.setStage(5);
                        async.each(
                            punishments,
                            (punishment, next) => {
                                if (
                                    punishment.active === false ||
                                    punishment.expiresAt < Date.now()
                                )
                                    return next();
                                this.cache
                                    .runJob("HSET", {
                                        table: "punishments",
                                        key: punishment._id,
                                        value: punishmentSchema(
                                            punishment,
                                            punishment._id
                                        ),
                                    })
                                    .then(() => next())
                                    .catch(next);
                            },
                            next
                        );
                    },
                ],
                async (err) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        reject(new Error(err));
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    /**
     * Gets all punishments in the cache that are active, and removes those that have expired
     *
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_PUNISHMENTS() {
        //cb
        return new Promise((resolve, reject) => {
            let punishmentsToRemove = [];
            async.waterfall(
                [
                    (next) => {
                        this.cache
                            .runJob("HGETALL", { table: "punishments" })
                            .then((punishmentsObj) =>
                                next(null, punishmentsObj)
                            )
                            .catch(next);
                    },

                    (punishmentsObj, next) => {
                        let punishments = [];
                        for (let id in punishmentsObj) {
                            let obj = punishmentsObj[id];
                            obj.punishmentId = id;
                            punishments.push(obj);
                        }
                        punishments = punishments.filter((punishment) => {
                            if (punishment.expiresAt < Date.now())
                                punishmentsToRemove.push(punishment);
                            return punishment.expiresAt > Date.now();
                        });
                        next(null, punishments);
                    },

                    (punishments, next) => {
                        async.each(
                            punishmentsToRemove,
                            (punishment, next2) => {
                                this.cache
                                    .runJob("HDEL", {
                                        table: "punishments",
                                        key: punishment.punishmentId,
                                    })
                                    .finally(() => next2());
                            },
                            () => {
                                next(null, punishments);
                            }
                        );
                    },
                ],
                (err, punishments) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve(punishments);
                }
            );
        });
    }

    /**
     * Gets a punishment by id
     *
     * @param {String} id - the id of the punishment we are trying to get
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_PUNISHMENT() {
        //id, cb
        return new Promise(async (resolve, reject) => {
            const punishmentModel = await db.runJob("GET_MODEL", {
                modelName: "punishment",
            });

            async.waterfall(
                [
                    (next) => {
                        if (!mongoose.Types.ObjectId.isValid(payload.id))
                            return next("Id is not a valid ObjectId.");
                        this.cache
                            .runJob("HGET", {
                                table: "punishments",
                                key: payload.id,
                            })
                            .then((punishment) => next(null, punishment))
                            .catch(next);
                    },

                    (punishment, next) => {
                        if (punishment) return next(true, punishment);
                        punishmentModel.findOne({ _id: payload.id }, next);
                    },

                    (punishment, next) => {
                        if (punishment) {
                            this.cache
                                .runJob("HSET", {
                                    table: "punishments",
                                    key: payload.id,
                                    value: punishment,
                                })
                                .then((punishment) => next(null, punishment))
                                .catch(next);
                        } else next("Punishment not found.");
                    },
                ],
                (err, punishment) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve(punishment);
                }
            );
        });
    }

    /**
     * Gets all punishments from a userId
     *
     * @param {String} userId - the userId of the punishment(s) we are trying to get
     * @param {Function} cb - gets called once we're done initializing
     */
    GET_PUNISHMENTS_FROM_USER_ID(payload) {
        //userId, cb
        return new Promise((resolve, reject) => {
            async.waterfall(
                [
                    (next) => {
                        this.runJob("GET_PUNISHMENTS", {})
                            .then((punishments) => next(null, punishments))
                            .catch(next);
                    },
                    (punishments, next) => {
                        punishments = punishments.filter((punishment) => {
                            return (
                                punishment.type === "banUserId" &&
                                punishment.value === payload.userId
                            );
                        });
                        next(null, punishments);
                    },
                ],
                (err, punishments) => {
                    if (err && err !== true) return reject(new Error(err));

                    resolve(punishments);
                }
            );
        });
    }

    ADD_PUNISHMENT(payload) {
        //type, value, reason, expiresAt, punishedBy, cb
        return new Promise(async (resolve, reject) => {
            const punishmentModel = await db.runJob("GET_MODEL", {
                modelName: "punishment",
            });

            const punishmentSchema = await cache.runJob("GET_SCHEMA", {
                schemaName: "punishment",
            });

            async.waterfall(
                [
                    (next) => {
                        const punishment = new punishmentModel({
                            type: payload.type,
                            value: payload.value,
                            reason: payload.reason,
                            active: true,
                            expiresAt: payload.expiresAt,
                            punishedAt: Date.now(),
                            punishedBy: payload.punishedBy,
                        });
                        punishment.save((err, punishment) => {
                            if (err) return next(err);
                            next(null, punishment);
                        });
                    },

                    (punishment, next) => {
                        this.cache
                            .runJob("HSET", {
                                table: "punishments",
                                key: punishment._id,
                                value: punishmentSchema(
                                    punishment,
                                    punishment._id
                                ),
                            })
                            .then(() => next())
                            .catch(next);
                    },

                    (punishment, next) => {
                        // DISCORD MESSAGE
                        next(null, punishment);
                    },
                ],
                (err, punishment) => {
                    if (err) return reject(new Error(err));
                    resolve(punishment);
                }
            );
        });
    }
}

module.exports = new PunishmentsModule();
