import async from "async";
import config from "config";
import redis from "redis";
import mongoose from "mongoose";

import CoreClass from "../../core";

// Lightweight / convenience wrapper around redis module for our needs

const pubs = {};
const subs = {};

let CacheModule;

class _CacheModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("cache");

		CacheModule = this;
	}

	/**
	 * Initialises the cache/redis module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	async initialize() {
		const importSchema = schemaName =>
			new Promise(resolve => {
				import(`./schemas/${schemaName}`).then(schema => resolve(schema.default));
			});

		this.schemas = {
			session: await importSchema("session"),
			station: await importSchema("station"),
			playlist: await importSchema("playlist"),
			officialPlaylist: await importSchema("officialPlaylist"),
			song: await importSchema("song"),
			punishment: await importSchema("punishment"),
			recentActivity: await importSchema("recentActivity"),
			ratings: await importSchema("ratings")
		};

		return new Promise((resolve, reject) => {
			this.url = config.get("redis").url;
			this.password = config.get("redis").password;

			this.log("INFO", "Connecting...");

			this.client = redis.createClient({
				url: this.url,
				password: this.password,
				reconnectStrategy: retries => {
					if (this.getStatus() !== "LOCKDOWN") {
						if (this.getStatus() !== "RECONNECTING") this.setStatus("RECONNECTING");

						this.log("INFO", `Attempting to reconnect.`);

						if (retries >= 10) {
							this.log("ERROR", `Stopped trying to reconnect.`);

							this.setStatus("FAILED");
							new Error("Stopped trying to reconnect.");
						} else {
							Math.min(retries * 50, 500);
						}
					}
				}
			});

			this.client.on("error", err => {
				if (this.getStatus() === "INITIALIZING") reject(err);
				if (this.getStatus() === "LOCKDOWN") return;

				this.log("ERROR", `Error ${err.message}.`);
			});

			this.client.on("ready", () => {
				this.log("INFO", "Redis is ready.");
				if (this.getStatus() === "INITIALIZING") resolve();
				else if (this.getStatus() === "FAILED" || this.getStatus() === "RECONNECTING") this.setStatus("READY");
			});

			this.client.connect().then(async () => {
				this.log("INFO", "Connected succesfully.");
			});

			// TODO move to a better place
			CacheModule.runJob("KEYS", { pattern: "longJobs.*" }).then(keys => {
				async.eachLimit(keys, 1, (key, next) => {
					CacheModule.runJob("DEL", { key }).finally(() => {
						next();
					});
				});
			});
		});
	}

	/**
	 * Quits redis client
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	QUIT() {
		return new Promise(resolve => {
			if (CacheModule.client.connected) {
				CacheModule.client.quit();
				Object.keys(pubs).forEach(channel => pubs[channel].quit());
				Object.keys(subs).forEach(channel => subs[channel].client.quit());
			}
			resolve();
		});
	}

	/**
	 * Sets a single value
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the key to set
	 * @param {*} payload.value - the value we want to set
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SET(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;
			let { value } = payload;

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
			// automatically stringify objects and arrays into JSON
			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.SET(key, value)
				.then(() => {
					let parsed = value;
					try {
						parsed = JSON.parse(value);
					} catch {
						// Do nothing
					}

					resolve(parsed);
				})
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Sets a single value in a table
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.table - name of the table we want to set a key of (table === redis hash)
	 * @param {string} payload.key -  name of the key to set
	 * @param {*} payload.value - the value we want to set
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	HSET(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;
			let { value } = payload;

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
			// automatically stringify objects and arrays into JSON
			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.HSET(payload.table, key, value)
				.then(() => {
					let parsed = value;
					try {
						parsed = JSON.parse(value);
					} catch {
						// Do nothing
					}

					resolve(parsed);
				})
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Gets a single value
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key - name of the key to fetch
	 * @param {boolean} [payload.parseJson=true] - attempt to parse returned data as JSON
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	GET(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;

			if (!key) {
				reject(new Error("Invalid key!"));
				return;
			}
			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

			CacheModule.client
				.GET(key, payload.value)
				.then(value => {
					if (value && !value.startsWith("{") && !value.startsWith("[")) return resolve(value);

					let parsedValue;
					try {
						parsedValue = JSON.parse(value);
					} catch (err) {
						return reject(err);
					}

					return resolve(parsedValue);
				})
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Gets a single value from a table
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.table - name of the table to get the value from (table === redis hash)
	 * @param {string} payload.key - name of the key to fetch
	 * @param {boolean} [payload.parseJson=true] - attempt to parse returned data as JSON
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	HGET(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;

			if (!key) {
				reject(new Error("Invalid key!"));
				return;
			}
			if (!payload.table) {
				reject(new Error("Invalid table!"));
				return;
			}
			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

			CacheModule.client
				.HGET(payload.table, key, payload.value)
				.then(value => {
					let parsedValue;
					try {
						parsedValue = JSON.parse(value);
					} catch (err) {
						return reject(err);
					}

					return resolve(parsedValue);
				})
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Deletes a single value from a table
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.table - name of the table to delete the value from (table === redis hash)
	 * @param {string} payload.key - name of the key to delete
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	HDEL(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;

			if (!payload.table) {
				reject(new Error("Invalid table!"));
				return;
			}
			if (!key) {
				reject(new Error("Invalid key!"));
				return;
			}

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

			CacheModule.client
				.HDEL(payload.table, key)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Returns all the keys for a table
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.table - name of the table to get the values from (table === redis hash)
	 * @param {boolean} [payload.parseJson=true] - attempts to parse all values as JSON by default
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	HGETALL(payload) {
		return new Promise((resolve, reject) => {
			if (!payload.table) {
				reject(new Error("Invalid table!"));
				return;
			}

			CacheModule.client
				.HGETALL(payload.table)
				.then(obj => {
					if (obj)
						Object.keys(obj).forEach(key => {
							obj[key] = JSON.parse(obj[key]);
						});
					else if (!obj) obj = [];
					resolve(obj);
				})
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Deletes a single value
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key - name of the key to delete
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	DEL(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;

			if (!key) {
				reject(new Error("Invalid key!"));
				return;
			}

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

			CacheModule.client
				.DEL(key)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Publish a message to a channel, caches the redis client connection
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.channel - the name of the channel we want to publish a message to
	 * @param {*} payload.value - the value we want to send
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	PUB(payload) {
		return new Promise((resolve, reject) => {
			let { value } = payload;

			if (!payload.channel) {
				reject(new Error("Invalid channel!"));
				return;
			}
			if (!value) {
				reject(new Error("Invalid value!"));
				return;
			}

			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.publish(payload.channel, value)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Subscribe to a channel, caches the redis client connection
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.channel - name of the channel to subscribe to
	 * @param {boolean} [payload.parseJson=true] - parse the message as JSON
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SUB(payload) {
		return new Promise((resolve, reject) => {
			if (!payload.channel) {
				reject(new Error("Invalid channel!"));
				return;
			}

			if (subs[payload.channel] === undefined) {
				subs[payload.channel] = {
					client: redis.createClient({
						url: CacheModule.url,
						password: CacheModule.password
					}),
					cbs: []
				};
				subs[payload.channel].client.connect().then(() => {
					subs[payload.channel].client.subscribe(payload.channel, (message, channel) => {
						if (message.startsWith("[") || message.startsWith("{"))
							try {
								message = JSON.parse(message);
							} catch (err) {
								console.error(err);
							}
						else if (message.startsWith('"') && message.endsWith('"'))
							message = message.substring(1).substring(0, message.length - 2);

						subs[channel].cbs.forEach(cb => cb(message));
					});
				});
			}

			subs[payload.channel].cbs.push(payload.cb);

			resolve();
		});
	}

	/**
	 * Gets a full list from Redis
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key - name of the table to get the value from (table === redis hash)
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	LRANGE(payload) {
		return new Promise((resolve, reject) => {
			let { key } = payload;

			if (!key) {
				reject(new Error("Invalid key!"));
				return;
			}
			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

			CacheModule.client
				.LRANGE(key, 0, -1)
				.then(list => resolve(list))
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Adds a value to a list in Redis
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the list
	 * @param {*} payload.value - the value we want to set
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	RPUSH(payload) {
		return new Promise((resolve, reject) => {
			let { key, value } = payload;

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
			// automatically stringify objects and arrays into JSON
			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.RPUSH(key, value)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Adds a value to a list in Redis using LPUSH
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the list
	 * @param {*} payload.value - the value we want to set
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	LPUSH(payload) {
		return new Promise((resolve, reject) => {
			let { key, value } = payload;

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
			// automatically stringify objects and arrays into JSON
			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.LPUSH(key, value)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Gets the length of a Redis list
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the list
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	LLEN(payload) {
		return new Promise((resolve, reject) => {
			const { key } = payload;

			CacheModule.client
				.LLEN(key)
				.then(len => resolve(len))
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Removes an item from a list using RPOP
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the list
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	RPOP(payload) {
		return new Promise((resolve, reject) => {
			const { key } = payload;

			CacheModule.client
				.RPOP(key)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Removes a value from a list in Redis
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.key -  name of the list
	 * @param {*} payload.value - the value we want to remove
	 * @param {boolean} [payload.stringifyJson=true] - stringify 'value' if it's an Object or Array
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	LREM(payload) {
		return new Promise((resolve, reject) => {
			let { key, value } = payload;

			if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
			// automatically stringify objects and arrays into JSON
			if (["object", "array"].includes(typeof value)) value = JSON.stringify(value);

			CacheModule.client
				.LREM(key, 1, value)
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Gets a list of keys in Redis with a matching pattern
	 *
	 * @param {object} payload - object containing payload
	 * @param {string} payload.pattern -  pattern to search for
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	KEYS(payload) {
		return new Promise((resolve, reject) => {
			const { pattern } = payload;

			CacheModule.client
				.KEYS(pattern)
				.then(keys => resolve(keys))
				.catch(err => reject(new Error(err)));
		});
	}

	/**
	 * Returns a redis schema
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.schemaName - the name of the schema to get
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	GET_SCHEMA(payload) {
		return new Promise(resolve => {
			resolve(CacheModule.schemas[payload.schemaName]);
		});
	}
}

export default new _CacheModule();
