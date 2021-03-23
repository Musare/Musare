import config from "config";

import crypto from "crypto";
import redis from "redis";

import CoreClass from "../core";

let NotificationsModule;
let UtilsModule;

class _NotificationsModule extends CoreClass {
	// eslint-disable-next-line require-jsdoc
	constructor() {
		super("notifications");

		this.subscriptions = [];

		NotificationsModule = this;
	}

	/**
	 * Initialises the notifications module
	 *
	 * @returns {Promise} - returns promise (reject, resolve)
	 */
	initialize() {
		return new Promise((resolve, reject) => {
			const url = (this.url = config.get("redis").url);
			const password = (this.password = config.get("redis").password);

			UtilsModule = this.moduleManager.modules.utils;

			this.pub = redis.createClient({
				url,
				password,
				retry_strategy: options => {
					if (this.getStatus() === "LOCKDOWN") return;
					if (this.getStatus() !== "RECONNECTING") this.setStatus("RECONNECTING");

					this.log("INFO", `Attempting to reconnect.`);

					if (options.attempt >= 10) {
						this.log("ERROR", `Stopped trying to reconnect.`);

						this.setStatus("FAILED");

						// this.failed = true;
						// this._lockdown();
					}
				}
			});
			this.sub = redis.createClient({
				url,
				password,
				retry_strategy: options => {
					if (this.getStatus() === "LOCKDOWN") return;
					if (this.getStatus() !== "RECONNECTING") this.setStatus("RECONNECTING");

					this.log("INFO", `Attempting to reconnect.`);

					if (options.attempt >= 10) {
						this.log("ERROR", `Stopped trying to reconnect.`);

						this.setStatus("FAILED");

						// this.failed = true;
						// this._lockdown();
					}
				}
			});

			this.sub.on("error", err => {
				if (this.getStatus() === "INITIALIZING") reject(err);
				if (this.getStatus() === "LOCKDOWN") return;

				this.log("ERROR", `Error ${err.message}.`);
			});

			this.pub.on("error", err => {
				if (this.getStatus() === "INITIALIZING") reject(err);
				if (this.getStatus() === "LOCKDOWN") return;

				this.log("ERROR", `Error ${err.message}.`);
			});

			this.sub.on("connect", () => {
				this.log("INFO", "Sub connected succesfully.");

				if (this.getStatus() === "INITIALIZING") resolve();
				else if (this.getStatus() === "LOCKDOWN" || this.getStatus() === "RECONNECTING")
					this.setStatus("READY");
			});

			this.pub.on("connect", () => {
				this.log("INFO", "Pub connected succesfully.");

				this.pub.config("GET", "notify-keyspace-events", async (err, response) => {
					if (err) {
						const formattedErr = await UtilsModule.runJob(
							"GET_ERROR",
							{
								error: err
							},
							this
						);
						this.log(
							"ERROR",
							"NOTIFICATIONS_INITIALIZE",
							`Getting notify-keyspace-events gave an error. ${formattedErr}`
						);
						this.log(
							"STATION_ISSUE",
							`Getting notify-keyspace-events gave an error. ${formattedErr}. ${response}`
						);
						return;
					}
					if (response[1] === "xE") {
						this.log("INFO", "NOTIFICATIONS_INITIALIZE", `notify-keyspace-events is set correctly`);
						this.log("STATION_ISSUE", `notify-keyspace-events is set correctly`);
					} else {
						this.log(
							"ERROR",
							"NOTIFICATIONS_INITIALIZE",
							`notify-keyspace-events is NOT correctly! It is set to: ${response[1]}`
						);
						this.log(
							"STATION_ISSUE",
							`notify-keyspace-events is NOT correctly! It is set to: ${response[1]}`
						);
					}
				});

				if (this.getStatus() === "INITIALIZING") resolve();
				else if (this.getStatus() === "LOCKDOWN" || this.getStatus() === "RECONNECTING")
					this.setStatus("INITIALIZED");
			});

			this.sub.on("pmessage", (pattern, channel, expiredKey) => {
				this.log(
					"STATION_ISSUE",
					`PMESSAGE1 - Pattern: ${pattern}; Channel: ${channel}; ExpiredKey: ${expiredKey}`
				);

				this.subscriptions.forEach(sub => {
					this.log(
						"STATION_ISSUE",
						`PMESSAGE2 - Sub name: ${sub.name}; Calls cb: ${!(sub.name !== expiredKey)}`
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
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.name - the name of the notification we want to schedule
	 * @param {number} payload.time - how long in milliseconds until the notification should be fired
	 * @param {object} payload.station - the station object related to the notification
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SCHEDULE(payload) {
		return new Promise((resolve, reject) => {
			const time = Math.round(payload.time);
			if (time <= 0) reject(new Error("Time has to be higher than 0"));
			else {
				NotificationsModule.log(
					"STATION_ISSUE",
					`SCHEDULE - Time: ${time}; Name: ${payload.name}; Key: ${crypto
						.createHash("md5")
						.update(`_notification:${payload.name}_`)
						.digest("hex")}; StationId: ${payload.station._id}; StationName: ${payload.station.name}`
				);
				NotificationsModule.pub.set(
					crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"),
					"",
					"PX",
					time,
					"NX",
					err => {
						if (err) reject(err);
						else resolve();
					}
				);
			}
		});
	}

	/**
	 * Subscribes a callback function to be called when a notification gets called
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.name - the name of the notification we want to subscribe to
	 * @param {boolean} payload.unique - only subscribe if another subscription with the same name doesn't already exist
	 * @param {object} payload.station - the station object related to the notification
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	SUBSCRIBE(payload) {
		return new Promise(resolve => {
			NotificationsModule.log(
				"STATION_ISSUE",
				`SUBSCRIBE - Name: ${payload.name}; Key: ${crypto
					.createHash("md5")
					.update(`_notification:${payload.name}_`)
					.digest("hex")}, StationId: ${payload.station._id}; StationName: ${payload.station.name}; Unique: ${
					payload.unique
				}; SubscriptionExists: ${!!NotificationsModule.subscriptions.find(
					subscription => subscription.originalName === payload.name
				)};`
			);
			if (
				payload.unique &&
				!!NotificationsModule.subscriptions.find(subscription => subscription.originalName === payload.name)
			)
				return resolve({
					subscription: NotificationsModule.subscriptions.find(
						subscription => subscription.originalName === payload.name
					)
				});

			const subscription = {
				originalName: payload.name,
				name: crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"),
				cb: payload.cb
			};

			NotificationsModule.subscriptions.push(subscription);

			return resolve({ subscription });
		});
	}

	/**
	 * Remove a notification subscription
	 *
	 * @param {object} payload - object containing the payload
	 * @param {object} payload.subscription - the subscription object returned by {@link subscribe}
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	REMOVE(payload) {
		// subscription
		return new Promise(resolve => {
			const index = NotificationsModule.subscriptions.indexOf(payload.subscription);
			if (index) NotificationsModule.subscriptions.splice(index, 1);
			resolve();
		});
	}

	/**
	 * Unschedules a notification by name (each notification has a unique name)
	 *
	 * @param {object} payload - object containing the payload
	 * @param {string} payload.name - the name of the notification we want to schedule
	 * @returns {Promise} - returns a promise (resolve, reject)
	 */
	UNSCHEDULE(payload) {
		// name
		return new Promise((resolve, reject) => {
			NotificationsModule.log(
				"STATION_ISSUE",
				`UNSCHEDULE - Name: ${payload.name}; Key: ${crypto
					.createHash("md5")
					.update(`_notification:${payload.name}_`)
					.digest("hex")}`
			);
			NotificationsModule.pub.del(
				crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"),
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}
}

export default new _NotificationsModule();
