'use strict';

const redis = require('redis');

// Lightweight / convenience wrapper around redis module for our needs

const pubs = {}, subs = {};
let initialized = false;
let callbacks = [];

const lib = {

	client: null,
	url: '',
	schemas: {
		session: require('./schemas/session'),
		station: require('./schemas/station'),
		playlist: require('./schemas/playlist'),
		song: require('./schemas/song')
	},

	/**
	 * Initializes the cache module
	 *
	 * @param {String} url - the url of the redis server
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: (url, cb) => {
		lib.url = url;

		lib.client = redis.createClient({ url: lib.url });
		lib.client.on('error', (err) => console.error(err));

		initialized = true;
		callbacks.forEach((callback) => {
			callback();
		});

		cb();
	},

	/**
	 * Gracefully closes all the Redis client connections
	 */
	quit: () => {
		lib.client.quit();
		Object.keys(pubs).forEach((channel) => pubs[channel].quit());
		Object.keys(subs).forEach((channel) => subs[channel].client.quit());
	},

	/**
	 * Sets a single value in a table
	 *
	 * @param {String} table - name of the table we want to set a key of (table === redis hash)
	 * @param {String} key -  name of the key to set
	 * @param {*} value - the value we want to set
	 * @param {Function} cb - gets called when the value has been set in Redis
	 * @param {Boolean} [stringifyJson=true] - stringify 'value' if it's an Object or Array
	 */
	hset: (table, key, value, cb, stringifyJson = true) => {

		// automatically stringify objects and arrays into JSON
		if (stringifyJson && ['object', 'array'].includes(typeof value)) value = JSON.stringify(value);

		lib.client.hset(table, key, value, err => {
			if (cb !== undefined) {
				if (err) return cb(err);
				cb(null);
			}
		});
	},

	/**
	 * Gets a single value from a table
	 *
	 * @param {String} table - name of the table to get the value from (table === redis hash)
	 * @param {String} key - name of the key to fetch
	 * @param {Function} cb - gets called when the value is returned from Redis
	 * @param {Boolean} [parseJson=true] - attempt to parse returned data as JSON
	 */
	hget: (table, key, cb, parseJson = true) => {
		lib.client.hget(table, key, (err, value) => {
			if (err) return typeof cb === 'function' ? cb(err) : null;
			if (parseJson) try { value = JSON.parse(value); } catch (e) {}
			if (typeof cb === 'function') cb(null, value);
		});
	},

	/**
	 * Deletes a single value from a table
	 *
	 * @param {String} table - name of the table to delete the value from (table === redis hash)
	 * @param {String} key - name of the key to delete
	 * @param {Function} cb - gets called when the value has been deleted from Redis or when it returned an error
	 */
	hdel: (table, key, cb) => {
		lib.client.hdel(table, key, (err) => {
			if (err) return typeof cb === 'function' ? cb(err) : null;
			if (typeof cb === 'function') cb(null);
		});
	},

	/**
	 * Returns all the keys for a table
	 *
	 * @param {String} table - name of the table to get the values from (table === redis hash)
	 * @param {Function} cb - gets called when the values are returned from Redis
	 * @param {Boolean} [parseJson=true] - attempts to parse all values as JSON by default
	 */
	hgetall: (table, cb, parseJson = true) => {
		lib.client.hgetall(table, (err, obj) => {
			if (err) return typeof cb === 'function' ? cb(err) : null;
			if (parseJson && obj) Object.keys(obj).forEach((key) => { try { obj[key] = JSON.parse(obj[key]); } catch (e) {} });
			cb(null, obj);
		});
	},

	/**
	 * Publish a message to a channel, caches the redis client connection
	 *
	 * @param {String} channel - the name of the channel we want to publish a message to
	 * @param {*} value - the value we want to send
	 * @param {Boolean} [stringifyJson=true] - stringify 'value' if it's an Object or Array
	 */
	pub: (channel, value, stringifyJson = true) => {

		/*if (pubs[channel] === undefined) {
		 pubs[channel] = redis.createClient({ url: lib.url });
		 pubs[channel].on('error', (err) => console.error);
		 }*/

		if (stringifyJson && ['object', 'array'].includes(typeof value)) value = JSON.stringify(value);

		//pubs[channel].publish(channel, value);
		lib.client.publish(channel, value);
	},

	/**
	 * Subscribe to a channel, caches the redis client connection
	 *
	 * @param {String} channel - name of the channel to subscribe to
	 * @param {Function} cb - gets called when a message is received
	 * @param {Boolean} [parseJson=true] - parse the message as JSON
	 */
	sub: (channel, cb, parseJson = true) => {
		if (initialized) {
			func();
		} else {
			callbacks.push(() => {
				func();
			});
		}
		function func() {
			if (subs[channel] === undefined) {
				subs[channel] = { client: redis.createClient({ url: lib.url }), cbs: [] };
				subs[channel].client.on('error', (err) => console.error(err));
				subs[channel].client.on('message', (channel, message) => {
					if (parseJson) try { message = JSON.parse(message); } catch (e) {}
					subs[channel].cbs.forEach((cb) => cb(message));
				});
				subs[channel].client.subscribe(channel);
			}
			
			subs[channel].cbs.push(cb);
		}
	}

};

module.exports = lib;