const CoreClass = require("../../core.js");

const redis = require("redis");
const config = require("config");
const mongoose = require("mongoose");

// Lightweight / convenience wrapper around redis module for our needs

const pubs = {},
    subs = {};

class CacheModule extends CoreClass {
    constructor() {
        super("cache");
    }

    initialize() {
        return new Promise((resolve, reject) => {
            this.schemas = {
                session: require("./schemas/session"),
                station: require("./schemas/station"),
                playlist: require("./schemas/playlist"),
                officialPlaylist: require("./schemas/officialPlaylist"),
                song: require("./schemas/song"),
                punishment: require("./schemas/punishment"),
            };

            this.url = config.get("redis").url;
            this.password = config.get("redis").password;

            this.log("INFO", "Connecting...");

            this.client = redis.createClient({
                url: this.url,
                password: this.password,
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

            this.client.on("error", (err) => {
                if (this.getStatus() === "INITIALIZING") reject(err);
                if (this.getStatus() === "LOCKDOWN") return;

                this.log("ERROR", `Error ${err.message}.`);
            });

            this.client.on("connect", () => {
                this.log("INFO", "Connected succesfully.");

                if (this.getStatus() === "INITIALIZING") resolve();
                else if (
                    this.getStatus() === "FAILED" ||
                    this.getStatus() === "RECONNECTING"
                )
                    this.setStatus("READY");
            });
        });
    }

    /**
     * Gracefully closes all the Redis client connections
     */
    QUIT(payload) {
        return new Promise((resolve, reject) => {
            if (this.client.connected) {
                this.client.quit();
                Object.keys(pubs).forEach((channel) => pubs[channel].quit());
                Object.keys(subs).forEach((channel) =>
                    subs[channel].client.quit()
                );
            }
            resolve();
        });
    }

    /**
     * Sets a single value in a table
     *
     * @param {String} table - name of the table we want to set a key of (table === redis hash)
     * @param {String} key -  name of the key to set
     * @param {*} value - the value we want to set
     * @param {Function} cb - gets called when the value has been set in Redis
     * @param {Boolean} [stringifyJson=true] - stringify 'value' if it's an Object or Array
     */
    HSET(payload) {
        //table, key, value, cb, stringifyJson = true
        return new Promise((resolve, reject) => {
            let key = payload.key;
            let value = payload.value;

            if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
            // automatically stringify objects and arrays into JSON
            if (["object", "array"].includes(typeof value))
                value = JSON.stringify(value);

            this.client.hset(payload.table, key, value, (err) => {
                if (err) return reject(new Error(err));
                else resolve(JSON.parse(value));
            });
        });
    }

    /**
     * Gets a single value from a table
     *
     * @param {String} table - name of the table to get the value from (table === redis hash)
     * @param {String} key - name of the key to fetch
     * @param {Function} cb - gets called when the value is returned from Redis
     * @param {Boolean} [parseJson=true] - attempt to parse returned data as JSON
     */
    HGET(payload) {
        //table, key, cb, parseJson = true
        return new Promise((resolve, reject) => {
            // if (!key || !table)
            // return typeof cb === "function" ? cb(null, null) : null;
            let key = payload.key;

            if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

            this.client.hget(payload.table, key, (err, value) => {
                if (err) return reject(new Error(err));
                try {
                    value = JSON.parse(value);
                } catch (e) {}
                resolve(value);
            });
        });
    }

    /**
     * Deletes a single value from a table
     *
     * @param {String} table - name of the table to delete the value from (table === redis hash)
     * @param {String} key - name of the key to delete
     * @param {Function} cb - gets called when the value has been deleted from Redis or when it returned an error
     */
    HDEL(payload) {
        //table, key, cb
        return new Promise((resolve, reject) => {
            // if (!payload.key || !table || typeof key !== "string")
            // return cb(null, null);

            let key = payload.key;

            if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

            this.client.hdel(payload.table, key, (err) => {
                if (err) return reject(new Error(err));
                else return resolve();
            });
        });
    }

    /**
     * Returns all the keys for a table
     *
     * @param {String} table - name of the table to get the values from (table === redis hash)
     * @param {Function} cb - gets called when the values are returned from Redis
     * @param {Boolean} [parseJson=true] - attempts to parse all values as JSON by default
     */
    HGETALL(payload) {
        //table, cb, parseJson = true
        return new Promise((resolve, reject) => {
            this.client.hgetall(payload.table, (err, obj) => {
                if (err) return reject(new Error(err));
                if (obj)
                    Object.keys(obj).forEach((key) => {
                        try {
                            obj[key] = JSON.parse(obj[key]);
                        } catch (e) {}
                    });
                else if (!obj) obj = [];
                resolve(obj);
            });
        });
    }

    /**
     * Publish a message to a channel, caches the redis client connection
     *
     * @param {String} channel - the name of the channel we want to publish a message to
     * @param {*} value - the value we want to send
     * @param {Boolean} [stringifyJson=true] - stringify 'value' if it's an Object or Array
     */
    PUB(payload) {
        //channel, value, stringifyJson = true
        return new Promise((resolve, reject) => {
            /*if (pubs[channel] === undefined) {
            pubs[channel] = redis.createClient({ url: this.url });
            pubs[channel].on('error', (err) => console.error);
            }*/

            let value = payload.value;

            if (["object", "array"].includes(typeof value))
                value = JSON.stringify(value);

            //pubs[channel].publish(channel, value);
            this.client.publish(payload.channel, value);

            resolve();
        });
    }

    /**
     * Subscribe to a channel, caches the redis client connection
     *
     * @param {String} channel - name of the channel to subscribe to
     * @param {Function} cb - gets called when a message is received
     * @param {Boolean} [parseJson=true] - parse the message as JSON
     */
    SUB(payload) {
        //channel, cb, parseJson = true
        return new Promise((resolve, reject) => {
            if (subs[payload.channel] === undefined) {
                subs[payload.channel] = {
                    client: redis.createClient({
                        url: this.url,
                        password: this.password,
                    }),
                    cbs: [],
                };
                subs[payload.channel].client.on(
                    "message",
                    (channel, message) => {
                        try {
                            message = JSON.parse(message);
                        } catch (e) {}
                        subs[channel].cbs.forEach((cb) => payload.cb(message));
                    }
                );
                subs[payload.channel].client.subscribe(payload.channel);
            }

            subs[payload.channel].cbs.push(payload.cb);

            resolve();
        });
    }

    GET_SCHEMA(payload) {
        return new Promise((resolve, reject) => {
            resolve(this.schemas[payload.schemaName]);
        });
    }
}

module.exports = new CacheModule();
