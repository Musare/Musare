'use strict';

const coreClass = require("../../core");

const redis = require('redis');
const config = require('config');
const mongoose = require('mongoose');

// Lightweight / convenience wrapper around redis module for our needs

const pubs = {}, subs = {};

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			this.schemas = {
				session: require('./schemas/session'),
				station: require('./schemas/station'),
				playlist: require('./schemas/playlist'),
				officialPlaylist: require('./schemas/officialPlaylist'),
				song: require('./schemas/song'),
				punishment: require('./schemas/punishment')
			}

			this.url = config.get("redis").url;
			this.password = config.get("redis").password;

			this.logger.info("REDIS", "Connecting...");

			this.client = redis.createClient({
				url: this.url,
				password: this.password,
				retry_strategy: (options) => {
					if (this.state === "LOCKDOWN") return;
					if (this.state !== "RECONNECTING") this.setState("RECONNECTING");

					this.logger.info("CACHE_MODULE", `Attempting to reconnect.`);

					if (options.attempt >= 10) {
						this.logger.error("CACHE_MODULE", `Stopped trying to reconnect.`);

						this.failed = true;
						this._lockdown();

						return undefined;
					}

					return 3000;
				}
			});

			this.client.on('error', err => {
				if (this.state === "INITIALIZING") reject(err);
				if(this.state === "LOCKDOWN") return;

				this.logger.error("CACHE_MODULE", `Error ${err.message}.`);
			});

			this.client.on("connect", () => {
				this.logger.info("CACHE_MODULE", "Connected succesfully.");

				if (this.state === "INITIALIZING") resolve();
				else if (this.state === "LOCKDOWN" || this.state === "RECONNECTING") this.setState("INITIALIZED");
			});
		});
	}

	/**
	 * Gracefully closes all the Redis client connections
	 */
	async quit() {
		try { await this._validateHook(); } catch { return; }

		if (this.client.connected) {
			this.client.quit();
			Object.keys(pubs).forEach((channel) => pubs[channel].quit());
			Object.keys(subs).forEach((channel) => subs[channel].client.quit());
		}
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
	async hset(table, key, value, cb, stringifyJson = true) {
		try { await this._validateHook(); } catch { return; }

		if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();
		// automatically stringify objects and arrays into JSON
		if (stringifyJson && ['object', 'array'].includes(typeof value)) value = JSON.stringify(value);

		this.client.hset(table, key, value, err => {
			if (cb !== undefined) {
				if (err) return cb(err);
				cb(null, JSON.parse(value));
			}
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
	async hget(table, key, cb, parseJson = true) {
		try { await this._validateHook(); } catch { return; }

		if (!key || !table) return typeof cb === 'function' ? cb(null, null) : null;
		if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

		this.client.hget(table, key, (err, value) => {
			if (err) return typeof cb === 'function' ? cb(err) : null;
			if (parseJson) try {
				value = JSON.parse(value);
			} catch (e) {
			}
			if (typeof cb === 'function') cb(null, value);
		});
	}

	/**
	 * Deletes a single value from a table
	 *
	 * @param {String} table - name of the table to delete the value from (table === redis hash)
	 * @param {String} key - name of the key to delete
	 * @param {Function} cb - gets called when the value has been deleted from Redis or when it returned an error
	 */
	async hdel(table, key, cb) {
		try { await this._validateHook(); } catch { return; }

		if (!key || !table || typeof key !== "string") return cb(null, null);
		if (mongoose.Types.ObjectId.isValid(key)) key = key.toString();

		this.client.hdel(table, key, (err) => {
			if (err) return cb(err);
			else return cb(null);
		});
	}

	/**
	 * Returns all the keys for a table
	 *
	 * @param {String} table - name of the table to get the values from (table === redis hash)
	 * @param {Function} cb - gets called when the values are returned from Redis
	 * @param {Boolean} [parseJson=true] - attempts to parse all values as JSON by default
	 */
	async hgetall(table, cb, parseJson = true) {
		try { await this._validateHook(); } catch { return; }

		if (!table) return cb(null, null);

		this.client.hgetall(table, (err, obj) => {
			if (err) return typeof cb === 'function' ? cb(err) : null;
			if (parseJson && obj) Object.keys(obj).forEach((key) => { try { obj[key] = JSON.parse(obj[key]); } catch (e) {} });
			if (parseJson && !obj) obj = [];
			cb(null, obj);
		});
	}

	/**
	 * Publish a message to a channel, caches the redis client connection
	 *
	 * @param {String} channel - the name of the channel we want to publish a message to
	 * @param {*} value - the value we want to send
	 * @param {Boolean} [stringifyJson=true] - stringify 'value' if it's an Object or Array
	 */
	async pub(channel, value, stringifyJson = true) {
		try { await this._validateHook(); } catch { return; }
		/*if (pubs[channel] === undefined) {
		 pubs[channel] = redis.createClient({ url: this.url });
		 pubs[channel].on('error', (err) => console.error);
		 }*/

		if (stringifyJson && ['object', 'array'].includes(typeof value)) value = JSON.stringify(value);

		//pubs[channel].publish(channel, value);
		this.client.publish(channel, value);
	}

	/**
	 * Subscribe to a channel, caches the redis client connection
	 *
	 * @param {String} channel - name of the channel to subscribe to
	 * @param {Function} cb - gets called when a message is received
	 * @param {Boolean} [parseJson=true] - parse the message as JSON
	 */
	async sub(channel, cb, parseJson = true) {
		try { await this._validateHook(); } catch { return; }

		if (subs[channel] === undefined) {
			subs[channel] = { client: redis.createClient({ url: this.url, password: this.password }), cbs: [] };
			subs[channel].client.on('message', (channel, message) => {
				if (parseJson) try { message = JSON.parse(message); } catch (e) {}
				subs[channel].cbs.forEach((cb) => cb(message));
			});
			subs[channel].client.subscribe(channel);
		}

		subs[channel].cbs.push(cb);
	}
}
