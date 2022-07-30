import config from "config";

import crypto from "crypto";
import redis from "redis";

import CoreClass from "../core";

let NotificationsModule;

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

			this.pub = redis.createClient({
				url,
				password,
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

			this.pub.on("error", err => {
				if (this.getStatus() === "INITIALIZING") reject(err);
				if (this.getStatus() === "LOCKDOWN") return;

				this.log("ERROR", `Error ${err.message}.`);
			});

			this.pub.connect().then(async () => {
				this.log("INFO", "Pub connected succesfully.");

				this.pub
					.sendCommand(["CONFIG", "GET", "notify-keyspace-events"])
					.then(response => {
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
					})
					.catch(err => {
						this.log(
							"ERROR",
							"NOTIFICATIONS_INITIALIZE",
							`Getting notify-keyspace-events gave an error. ${err}`
						);
						this.log("STATION_ISSUE", `Getting notify-keyspace-events gave an error. ${err}.`);
					});

				if (this.getStatus() === "INITIALIZING") resolve();
				else if (this.getStatus() === "LOCKDOWN" || this.getStatus() === "RECONNECTING")
					this.setStatus("INITIALIZED");
			});

			this.sub = this.pub.duplicate();

			this.sub.on("error", err => {
				if (this.getStatus() === "INITIALIZING") reject(err);
				if (this.getStatus() === "LOCKDOWN") return;

				this.log("ERROR", `Error ${err.message}.`);
			});

			this.sub.connect().then(async () => {
				this.log("INFO", "Sub connected succesfully.");

				if (this.getStatus() === "INITIALIZING") resolve();
				else if (this.getStatus() === "LOCKDOWN" || this.getStatus() === "RECONNECTING")
					this.setStatus("READY");

				this.sub.PSUBSCRIBE(`__keyevent@${this.sub.options.database}__:expired`, (message, channel) => {
					this.log("STATION_ISSUE", `PMESSAGE1 - Channel: ${channel}; ExpiredKey: ${message}`);

					this.subscriptions.forEach(sub => {
						this.log(
							"STATION_ISSUE",
							`PMESSAGE2 - Sub name: ${sub.name}; Calls cb: ${!(sub.name !== message)}`
						);
						if (sub.name !== message) return;
						sub.cb();
					});
				});
			});
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
				NotificationsModule.pub
					.SET(crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"), "", {
						PX: time,
						NX: true
					})
					.then(() => resolve())
					.catch(err => reject(new Error(err)));
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
			) {
				resolve({
					subscription: NotificationsModule.subscriptions.find(
						subscription => subscription.originalName === payload.name
					)
				});
				return;
			}

			const subscription = {
				originalName: payload.name,
				name: crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"),
				cb: payload.cb
			};

			NotificationsModule.subscriptions.push(subscription);

			resolve({ subscription });
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
			NotificationsModule.pub
				.DEL(crypto.createHash("md5").update(`_notification:${payload.name}_`).digest("hex"))
				.then(() => resolve())
				.catch(err => reject(new Error(err)));
		});
	}
}

export default new _NotificationsModule();
