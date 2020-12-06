const CoreClass = require("../core.js");

const crypto = require("crypto");
const redis = require("redis");
const config = require("config");
const utils = require("./utils");

const subscriptions = [];

class NotificationsModule extends CoreClass {
    constructor() {
        super("notifications");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            const url = (this.url = config.get("redis").url);
            const password = (this.password = config.get("redis").password);

            this.pub = redis.createClient({
                url,
                password,
                retry_strategy: (options) => {
                    if (this.getStatus() === "LOCKDOWN") return;
                    if (this.getStatus() !== "RECONNECTING")
                        this.setStatus("RECONNECTING");

                    this.log("INFO", `Attempting to reconnect.`);

                    if (options.attempt >= 10) {
                        this.log("ERROR", `Stopped trying to reconnect.`);

                        this.setStatus("FAILED");

                        // this.failed = true;
                        // this._lockdown();

                        return undefined;
                    }

                    return 3000;
                },
            });
            this.sub = redis.createClient({
                url,
                password,
                retry_strategy: (options) => {
                    if (this.getStatus() === "LOCKDOWN") return;
                    if (this.getStatus() !== "RECONNECTING")
                        this.setStatus("RECONNECTING");

                    this.log("INFO", `Attempting to reconnect.`);

                    if (options.attempt >= 10) {
                        this.log("ERROR", `Stopped trying to reconnect.`);

                        this.setStatus("FAILED");

                        // this.failed = true;
                        // this._lockdown();

                        return undefined;
                    }

                    return 3000;
                },
            });

            this.sub.on("error", (err) => {
                if (this.getStatus() === "INITIALIZING") reject(err);
                if (this.getStatus() === "LOCKDOWN") return;

                this.log("ERROR", `Error ${err.message}.`);
            });

            this.pub.on("error", (err) => {
                if (this.getStatus() === "INITIALIZING") reject(err);
                if (this.getStatus() === "LOCKDOWN") return;

                this.log("ERROR", `Error ${err.message}.`);
            });

            this.sub.on("connect", () => {
                this.log("INFO", "Sub connected succesfully.");

                if (this.getStatus() === "INITIALIZING") resolve();
                else if (
                    this.getStatus() === "LOCKDOWN" ||
                    this.getStatus() === "RECONNECTING"
                )
                    this.setStatus("READY");
            });

            this.pub.on("connect", () => {
                this.log("INFO", "Pub connected succesfully.");

                this.pub.config("GET", "notify-keyspace-events", async (err, response) => {
                    if (err) {
                        err = await utils.runJob("GET_ERROR", { error: err });
                        this.log("ERROR", "NOTIFICATIONS_INITIALIZE", `Getting notify-keyspace-events gave an error. ${err}`);
                        this.log(
                            "STATION_ISSUE",
                            `Getting notify-keyspace-events gave an error. ${err}. ${response}`
                        );
                        return;
                    }
                    if (response[1] === "xE") {
                        this.log("INFO", "NOTIFICATIONS_INITIALIZE", `notify-keyspace-events is set correctly`);
                        this.log("STATION_ISSUE", `notify-keyspace-events is set correctly`);
                    } else {
                        this.log("ERROR", "NOTIFICATIONS_INITIALIZE", `notify-keyspace-events is NOT correctly! It is set to: ${response[1]}`);
                        this.log("STATION_ISSUE", `notify-keyspace-events is NOT correctly! It is set to: ${response[1]}`);
                    }
                });

                if (this.getStatus() === "INITIALIZING") resolve();
                else if (
                    this.getStatus() === "LOCKDOWN" ||
                    this.getStatus() === "RECONNECTING"
                )
                    this.setStatus("INITIALIZED");
            });

            this.sub.on("pmessage", (pattern, channel, expiredKey) => {
                this.log(
                    "STATION_ISSUE",
                    `PMESSAGE1 - Pattern: ${pattern}; Channel: ${channel}; ExpiredKey: ${expiredKey}`
                );
                subscriptions.forEach((sub) => {
                    this.log(
                        "STATION_ISSUE",
                        `PMESSAGE2 - Sub name: ${sub.name}; Calls cb: ${!(
                            sub.name !== expiredKey
                        )}`
                    );
                    if (sub.name !== expiredKey) return;
                    sub.cb();
                });
            });

            this.sub.psubscribe(`__keyevent@${this.pub.options.db}__:expired`);
        });
    }

    /**
     * Schedules a notification to be dispatched in a specific amount of milliseconds,
     * notifications are unique by name, and the first one is always kept, as in
     * attempting to schedule a notification that already exists won't do anything
     *
     * @param {String} name - the name of the notification we want to schedule
     * @param {Integer} time - how long in milliseconds until the notification should be fired
     * @param {Function} cb - gets called when the notification has been scheduled
     */
    SCHEDULE(payload) {
        //name, time, cb, station
        return new Promise((resolve, reject) => {
            const time = Math.round(payload.time);
            this.log(
                "STATION_ISSUE",
                `SCHEDULE - Time: ${time}; Name: ${payload.name}; Key: ${crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex")}; StationId: ${
                    payload.station._id
                }; StationName: ${payload.station.name}`
            );
            this.pub.set(
                crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex"),
                "",
                "PX",
                time,
                "NX",
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }

    /**
     * Subscribes a callback function to be called when a notification gets called
     *
     * @param {String} name - the name of the notification we want to subscribe to
     * @param {Function} cb - gets called when the subscribed notification gets called
     * @param {Boolean} unique - only subscribe if another subscription with the same name doesn't already exist
     * @return {Object} - the subscription object
     */
    SUBSCRIBE(payload) {
        //name, cb, unique = false, station
        return new Promise((resolve, reject) => {
            this.log(
                "STATION_ISSUE",
                `SUBSCRIBE - Name: ${payload.name}; Key: ${crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex")}, StationId: ${
                    payload.station._id
                }; StationName: ${payload.station.name}; Unique: ${
                    payload.unique
                }; SubscriptionExists: ${!!subscriptions.find(
                    (subscription) => subscription.originalName === payload.name
                )};`
            );
            if (
                payload.unique &&
                !!subscriptions.find(
                    (subscription) => subscription.originalName === payload.name
                )
            )
                return resolve({
                    subscription: subscriptions.find(
                        (subscription) =>
                            subscription.originalName === payload.name
                    ),
                });
            let subscription = {
                originalName: payload.name,
                name: crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex"),
                cb: payload.cb,
            };
            subscriptions.push(subscription);
            resolve({ subscription });
        });
    }

    /**
     * Remove a notification subscription
     *
     * @param {Object} subscription - the subscription object returned by {@link subscribe}
     */
    REMOVE(payload) {
        //subscription
        return new Promise((resolve, reject) => {
            let index = subscriptions.indexOf(payload.subscription);
            if (index) subscriptions.splice(index, 1);
            resolve();
        });
    }

    UNSCHEDULE(payload) {
        //name
        return new Promise((resolve, reject) => {
            this.log(
                "STATION_ISSUE",
                `UNSCHEDULE - Name: ${payload.name}; Key: ${crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex")}`
            );
            this.pub.del(
                crypto
                    .createHash("md5")
                    .update(`_notification:${payload.name}_`)
                    .digest("hex"),
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
}

module.exports = new NotificationsModule();
