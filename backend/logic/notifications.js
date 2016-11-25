'use strict';

const crypto = require('crypto');
const redis = require('redis');

let client = null;

const subscriptions = [];

const lib = {

	/**
	 * Initializes the notifications module
	 *
	 * @param {String} url - the url of the redis server
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: (url, cb) => {
		client = redis.createClient({ url: url });
		client.on('error', (err) => console.error);
		client.on('message', (pattern, channel, expiredKey) => {
			subscriptions.forEach((sub) => {
				if (sub.name !== expiredKey) return;
				sub.cb();
			});
		});
		client.psubscribe('__keyevent@0__:expired');
		cb();
	},

	/**
	 * Schedules a notification to be dispatched in a specific amount of milliseconds,
	 * notifications are unique by name, and the first one is always kept, as in
	 * attempting to schedule a notification that already exists won't do anything
	 *
	 * @param {String} name - the name of the notification we want to schedule
	 * @param {Integer} time - how long in milliseconds until the notification should be fired
	 * @param {Function} cb - gets called when the notification has been scheduled
	 */
	schedule: (name, time, cb) => {
		client.set(crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), '', 'PX', 'NX', time, cb);
	},

	/**
	 * Subscribes a callback function to be called when a notification gets called
	 *
	 * @param {String} name - the name of the notification we want to subscribe to
	 * @param {Function} cb - gets called when the subscribed notification gets called
	 * @param {Boolean} unique - only subscribe if another subscription with the same name doesn't already exist
	 * @return {Object} - the subscription object
	 */
	subscribe: (name, cb, unique = false) => {
		if (unique && subscriptions.find((subscription) => subscription.name == name)) return;
		let subscription = { name: crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), cb };
		subscriptions.push(subscription);
		return subscription;
	},

	/**
	 * Remove a notification subscription
	 *
	 * @param {Object} subscription - the subscription object returned by {@link subscribe}
	 */
	remove: (subscription) => {
		let index = subscriptions.indexOf(subscription);
		if (index) subscriptions.splice(index, 1);
	}

};

module.exports = lib;
