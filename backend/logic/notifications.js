'use strict';

const crypto = require('crypto');
const redis = require('redis');
const logger = require('./logger');

let pub = null;
let sub = null;

const subscriptions = [];

const lib = {

	/**
	 * Initializes the notifications module
	 *
	 * @param {String} url - the url of the redis server
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: (url, cb) => {
		pub = redis.createClient({ url: url });
		sub = redis.createClient({ url: url });
		sub.on('error', (err) => {
			console.error(err);
			process.exit();
		});
		sub.on('pmessage', (pattern, channel, expiredKey) => {
			logger.stationIssue(`PMESSAGE - Pattern: ${pattern}; Channel: ${channel}; ExpiredKey: ${expiredKey}`);
			subscriptions.forEach((sub) => {
				if (sub.name !== expiredKey) return;
				sub.cb();
			});
		});
		sub.psubscribe('__keyevent@0__:expired');
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
	schedule: (name, time, cb, station) => {
		time = Math.round(time);
		logger.stationIssue(`SCHEDULE - Time: ${time}; Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}; StationId: ${station._id}; StationName: ${station.name}`);
		pub.set(crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), '', 'PX', time, 'NX', cb);
	},

	/**
	 * Subscribes a callback function to be called when a notification gets called
	 *
	 * @param {String} name - the name of the notification we want to subscribe to
	 * @param {Function} cb - gets called when the subscribed notification gets called
	 * @param {Boolean} unique - only subscribe if another subscription with the same name doesn't already exist
	 * @return {Object} - the subscription object
	 */
	subscribe: (name, cb, unique = false, station) => {
		if (unique && subscriptions.find((subscription) => subscription.originalName == name)) return;
		logger.stationIssue(`SUBSCRIBE - Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}, StationId: ${station._id}; StationName: ${station.name}`);
		let subscription = { originalName: name, name: crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), cb };
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
	},

	unschedule: (name) => {
		logger.stationIssue(`UNSCHEDULE - Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}`);
		pub.del(crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'));
	},
};

module.exports = lib;
