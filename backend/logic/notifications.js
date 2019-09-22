'use strict';

const coreClass = require("../core");

const crypto = require('crypto');
const redis = require('redis');
const config = require('config');

const subscriptions = [];

module.exports = class extends coreClass {
	initialize() {
		return new Promise((resolve, reject) => {
			this.setStage(1);

			const url = this.url = config.get("redis").url;
			const password = this.password = config.get("redis").password;

			this.pub = redis.createClient({
				url,
				password,
				retry_strategy: (options) => {
					if (this.state === "LOCKDOWN") return;
					if (this.state !== "RECONNECTING") this.setState("RECONNECTING");

					this.logger.info("NOTIFICATIONS_MODULE", `Attempting to reconnect pub.`);

					if (options.attempt >= 10) {
						this.logger.error("NOTIFICATIONS_MODULE", `Stopped trying to reconnect pub.`);

						this.failed = true;
						this._lockdown();

						return undefined;
					}

					return 3000;
				}
			});
			this.sub = redis.createClient({
				url,
				password,
				retry_strategy: (options) => {
					if (this.state === "LOCKDOWN") return;
					if (this.state !== "RECONNECTING") this.setState("RECONNECTING");

					this.logger.info("NOTIFICATIONS_MODULE", `Attempting to reconnect sub.`);

					if (options.attempt >= 10) {
						this.logger.error("NOTIFICATIONS_MODULE", `Stopped trying to reconnect sub.`);

						this.failed = true;
						this._lockdown();

						return undefined;
					}

					return 3000;
				}
			});

			this.sub.on('error', (err) => {
				if (this.state === "INITIALIZING") reject(err);
				if(this.state === "LOCKDOWN") return;

				this.logger.error("NOTIFICATIONS_MODULE", `Sub error ${err.message}.`);
			});

			this.pub.on('error', (err) => {
				if (this.state === "INITIALIZING") reject(err);
				if(this.state === "LOCKDOWN") return; 

				this.logger.error("NOTIFICATIONS_MODULE", `Pub error ${err.message}.`);
			});

			this.sub.on("connect", () => {
				this.logger.info("NOTIFICATIONS_MODULE", "Sub connected succesfully.");

				if (this.state === "INITIALIZING") resolve();
				else if (this.state === "LOCKDOWN" || this.state === "RECONNECTING") this.setState("INITIALIZED");
				
			});

			this.pub.on("connect", () => {
				this.logger.info("NOTIFICATIONS_MODULE", "Pub connected succesfully.");

				if (this.state === "INITIALIZING") resolve();
				else if (this.state === "LOCKDOWN" || this.state === "RECONNECTING") this.setState("INITIALIZED");
			});

			this.sub.on('pmessage', (pattern, channel, expiredKey) => {
				this.logger.stationIssue(`PMESSAGE1 - Pattern: ${pattern}; Channel: ${channel}; ExpiredKey: ${expiredKey}`);
				subscriptions.forEach((sub) => {
					this.logger.stationIssue(`PMESSAGE2 - Sub name: ${sub.name}; Calls cb: ${!(sub.name !== expiredKey)}`);
					if (sub.name !== expiredKey) return;
					sub.cb();
				});
			});

			this.sub.psubscribe('__keyevent@0__:expired');
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
	async schedule(name, time, cb, station) {
		try { await this._validateHook(); } catch { return; }

		if (!cb) cb = ()=>{};

		time = Math.round(time);
		this.logger.stationIssue(`SCHEDULE - Time: ${time}; Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}; StationId: ${station._id}; StationName: ${station.name}`);
		this.pub.set(crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), '', 'PX', time, 'NX', cb);
	}

	/**
	 * Subscribes a callback function to be called when a notification gets called
	 *
	 * @param {String} name - the name of the notification we want to subscribe to
	 * @param {Function} cb - gets called when the subscribed notification gets called
	 * @param {Boolean} unique - only subscribe if another subscription with the same name doesn't already exist
	 * @return {Object} - the subscription object
	 */
	async subscribe(name, cb, unique = false, station) {
		try { await this._validateHook(); } catch { return; }

		this.logger.stationIssue(`SUBSCRIBE - Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}, StationId: ${station._id}; StationName: ${station.name}; Unique: ${unique}; SubscriptionExists: ${!!subscriptions.find((subscription) => subscription.originalName == name)};`);
		if (unique && !!subscriptions.find((subscription) => subscription.originalName == name)) return;
		let subscription = { originalName: name, name: crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'), cb };
		subscriptions.push(subscription);
		return subscription;
	}

	/**
	 * Remove a notification subscription
	 *
	 * @param {Object} subscription - the subscription object returned by {@link subscribe}
	 */
	async remove(subscription) {
		try { await this._validateHook(); } catch { return; }

		let index = subscriptions.indexOf(subscription);
		if (index) subscriptions.splice(index, 1);
	}

	async unschedule(name) {
		try { await this._validateHook(); } catch { return; }

		this.logger.stationIssue(`UNSCHEDULE - Name: ${name}; Key: ${crypto.createHash('md5').update(`_notification:${name}_`).digest('hex')}`);
		this.pub.del(crypto.createHash('md5').update(`_notification:${name}_`).digest('hex'));
	}
}
