import { createClient, RedisClientType } from "redis";
import config from "config";
import crypto from "node:crypto";
import BaseModule from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import JobContext from "../JobContext";

export default class EventsModule extends BaseModule {
	private _pubClient?: RedisClientType;

	private _subClient?: RedisClientType;

	private _subscriptions: Record<string, ((message: any) => Promise<void>)[]>;

	private _scheduleCallbacks: Record<string, (() => Promise<void>)[]>;

	/**
	 * Events Module
	 */
	public constructor() {
		super("events");

		this._subscriptions = {};
		this._scheduleCallbacks = {};
		this._jobApiDefault = false;
	}

	/**
	 * startup - Startup events module
	 */
	public override async startup() {
		await super.startup();

		await this._createPubClient();
		await this._createSubClient();

		await super._started();
	}

	/**
	 * createPubClient - Create redis client for publishing
	 */
	private async _createPubClient() {
		this._pubClient = createClient({ ...config.get("redis") });

		await this._pubClient.connect();

		const redisConfigResponse = await this._pubClient.sendCommand([
			"CONFIG",
			"GET",
			"notify-keyspace-events"
		]);

		if (
			!(
				Array.isArray(redisConfigResponse) &&
				redisConfigResponse[1] === "xE"
			)
		)
			throw new Error(
				`notify-keyspace-events is NOT configured correctly! It is set to: ${
					(Array.isArray(redisConfigResponse) &&
						redisConfigResponse[1]) ||
					"unknown"
				}`
			);
	}

	/**
	 * createSubClient - Create redis client for subscribing
	 */
	private async _createSubClient() {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		this._subClient = this._pubClient?.duplicate();

		await this._subClient.connect();

		const { database = 0 } = this._subClient.options ?? {};

		await this._subClient.PSUBSCRIBE(
			`__keyevent@${database}__:expired`,
			async message => {
				if (!this._scheduleCallbacks[message]) return;

				await Promise.all(
					this._scheduleCallbacks[message].map(callback => callback())
				);
			}
		);
	}

	/**
	 * createKey - Create hex key
	 */
	private _createKey(type: "event" | "schedule", channel: string) {
		if (!["event", "schedule"].includes(type))
			throw new Error("Invalid type");

		if (!channel || typeof channel !== "string")
			throw new Error("Invalid channel");

		return crypto
			.createHash("md5")
			.update(`${type}:${channel}`)
			.digest("hex");
	}

	/**
	 * publish - Publish an event
	 */
	public async publish(
		context: JobContext,
		payload: { channel: string; value: any }
	) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		let { channel, value } = payload;

		channel = this._createKey("event", channel);

		if (!value) throw new Error("Invalid value");

		if (["object", "array"].includes(typeof value))
			value = JSON.stringify(value);

		await this._pubClient.publish(channel, value);
	}

	/**
	 * subscriptionListener - Listener for event subscriptions
	 */
	private async _subscriptionListener(message: string, channel: string) {
		if (!this._subscriptions || !this._subscriptions[channel]) return;

		if (message.startsWith("[") || message.startsWith("{"))
			try {
				message = JSON.parse(message);
			} catch (err) {
				console.error(err);
			}
		else if (message.startsWith('"') && message.endsWith('"'))
			message = message.substring(1).substring(0, message.length - 2);

		await Promise.all(this._subscriptions[channel].map(cb => cb(message)));
	}

	/**
	 * subscribe - Subscribe to an event or schedule completion
	 */
	public async subscribe(
		context: JobContext,
		payload: {
			type?: "event" | "schedule";
			channel: string;
			callback: (message?: any) => Promise<void>;
			unique?: boolean;
		}
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		const { type = "event", callback, unique = false } = payload;

		const channel = this._createKey(type, payload.channel);

		if (type === "schedule") {
			if (
				unique &&
				this._scheduleCallbacks[channel] &&
				this._scheduleCallbacks[channel].length > 0
			)
				return;

			if (!this._scheduleCallbacks[channel])
				this._scheduleCallbacks[channel] = [];

			this._scheduleCallbacks[channel].push(() => callback());

			return;
		}

		if (
			unique &&
			this._subscriptions[channel] &&
			this._subscriptions[channel].length > 0
		)
			return;

		if (!this._subscriptions[channel]) {
			this._subscriptions[channel] = [];

			await this._subClient.subscribe(channel, (...args) =>
				this._subscriptionListener(...args)
			);
		}

		this._subscriptions[channel].push(callback);
	}

	/**
	 * unsubscribe - Unsubscribe from an event or schedule completion
	 */
	public async unsubscribe(
		context: JobContext,
		payload: {
			type?: "event" | "schedule";
			channel: string;
			callback: (message?: any) => Promise<void>;
		}
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		const { type = "event", callback } = payload;
		const channel = this._createKey(type, payload.channel);

		if (type === "schedule") {
			if (!this._scheduleCallbacks[channel]) return;

			const index = this._scheduleCallbacks[channel].indexOf(callback);

			if (index >= 0) this._scheduleCallbacks[channel].splice(index, 1);

			return;
		}

		if (!this._subscriptions[channel]) return;

		const index = this._subscriptions[channel].indexOf(callback);

		if (index < 0) return;

		this._subscriptions[channel].splice(index, 1);

		if (this._subscriptions[channel].length === 0) {
			delete this._subscriptions[channel];
			await this._subClient.unsubscribe(channel, (...args) =>
				this._subscriptionListener(...args)
			);
		}
	}

	/**
	 * schedule - Schedule a callback trigger
	 */
	public async schedule(
		context: JobContext,
		payload: {
			channel: string;
			time: number;
		}
	) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		let { time } = payload;

		if (typeof time !== "number") throw new Error("Time must be a number");

		time = Math.round(time);

		if (time <= 0) throw new Error("Time must be greater than 0");

		const channel = this._createKey("schedule", payload.channel);

		await this._pubClient.set(channel, "", { PX: time, NX: true });
	}

	/**
	 * unschedule - Unschedule a callback trigger
	 */
	public async unschedule(
		context: JobContext,
		payload: {
			channel: string;
		}
	) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		const channel = this._createKey("schedule", payload.channel);

		await this._pubClient.del(channel);
	}

	/**
	 * shutdown - Shutdown events module
	 */
	public override async shutdown() {
		await super.shutdown();

		if (this._pubClient) await this._pubClient.quit();
		if (this._subClient) await this._subClient.quit();

		this._subscriptions = {};
		this._scheduleCallbacks = {};

		await this._stopped();
	}
}

export type EventsModuleJobs = {
	[Property in keyof UniqueMethods<EventsModule>]: {
		payload: Parameters<UniqueMethods<EventsModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<EventsModule>[Property]>>;
	};
};
