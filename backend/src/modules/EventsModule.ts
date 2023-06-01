import { createClient, RedisClientType } from "redis";
import config from "config";
import crypto from "node:crypto";
import BaseModule from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import JobContext from "../JobContext";

export default class EventsModule extends BaseModule {
	private pubClient?: RedisClientType;

	private subClient?: RedisClientType;

	private subscriptions: Record<string, ((message: any) => Promise<void>)[]>;

	private scheduleCallbacks: Record<string, (() => Promise<void>)[]>;

	/**
	 * Events Module
	 */
	public constructor() {
		super("events");

		this.subscriptions = {};
		this.scheduleCallbacks = {};
	}

	/**
	 * startup - Startup events module
	 */
	public override async startup() {
		await super.startup();

		await this.createPubClient();
		await this.createSubClient();

		await super.started();
	}

	/**
	 * createPubClient - Create redis client for publishing
	 */
	private async createPubClient() {
		this.pubClient = createClient({ ...config.get("redis") });

		await this.pubClient.connect();

		const redisConfigResponse = await this.pubClient.sendCommand([
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
	private async createSubClient() {
		if (!this.pubClient) throw new Error("Redis pubClient unavailable.");

		this.subClient = this.pubClient?.duplicate();

		await this.subClient.connect();

		const { database = 0 } = this.subClient.options ?? {};

		await this.subClient.PSUBSCRIBE(
			`__keyevent@${database}__:expired`,
			async message => {
				if (!this.scheduleCallbacks[message]) return;

				await Promise.all(
					this.scheduleCallbacks[message].map(callback => callback())
				);
			}
		);
	}

	/**
	 * createKey - Create hex key
	 */
	private createKey(type: "event" | "schedule", channel: string) {
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
		if (!this.pubClient) throw new Error("Redis pubClient unavailable.");

		let { channel, value } = payload;

		channel = this.createKey("event", channel);

		if (!value) throw new Error("Invalid value");

		if (["object", "array"].includes(typeof value))
			value = JSON.stringify(value);

		await this.pubClient.publish(channel, value);
	}

	/**
	 * subscriptionListener - Listener for event subscriptions
	 */
	private async subscriptionListener(message: string, channel: string) {
		if (!this.subscriptions || !this.subscriptions[channel]) return;

		if (message.startsWith("[") || message.startsWith("{"))
			try {
				message = JSON.parse(message);
			} catch (err) {
				console.error(err);
			}
		else if (message.startsWith('"') && message.endsWith('"'))
			message = message.substring(1).substring(0, message.length - 2);

		await Promise.all(this.subscriptions[channel].map(cb => cb(message)));
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
		if (!this.subClient) throw new Error("Redis subClient unavailable.");

		const { type = "event", callback, unique = false } = payload;

		const channel = this.createKey(type, payload.channel);

		if (type === "schedule") {
			if (
				unique &&
				this.scheduleCallbacks[channel] &&
				this.scheduleCallbacks[channel].length > 0
			)
				return;

			if (!this.scheduleCallbacks[channel])
				this.scheduleCallbacks[channel] = [];

			this.scheduleCallbacks[channel].push(() => callback());

			return;
		}

		if (
			unique &&
			this.subscriptions[channel] &&
			this.subscriptions[channel].length > 0
		)
			return;

		if (!this.subscriptions[channel]) {
			this.subscriptions[channel] = [];

			await this.subClient.subscribe(channel, (...args) =>
				this.subscriptionListener(...args)
			);
		}

		this.subscriptions[channel].push(callback);
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
		if (!this.subClient) throw new Error("Redis subClient unavailable.");

		const { type = "event", callback } = payload;
		const channel = this.createKey(type, payload.channel);

		if (type === "schedule") {
			if (!this.scheduleCallbacks[channel]) return;

			const index = this.scheduleCallbacks[channel].indexOf(callback);

			if (index >= 0) this.scheduleCallbacks[channel].splice(index, 1);

			return;
		}

		if (!this.subscriptions[channel]) return;

		const index = this.subscriptions[channel].indexOf(callback);

		if (index < 0) return;

		this.subscriptions[channel].splice(index, 1);

		if (this.subscriptions[channel].length === 0) {
			delete this.subscriptions[channel];
			await this.subClient.unsubscribe(channel, (...args) =>
				this.subscriptionListener(...args)
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
		if (!this.pubClient) throw new Error("Redis pubClient unavailable.");

		let { time } = payload;

		if (typeof time !== "number") throw new Error("Time must be a number");

		time = Math.round(time);

		if (time <= 0) throw new Error("Time must be greater than 0");

		const channel = this.createKey("schedule", payload.channel);

		await this.pubClient.set(channel, "", { PX: time, NX: true });
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
		if (!this.pubClient) throw new Error("Redis pubClient unavailable.");

		const channel = this.createKey("schedule", payload.channel);

		await this.pubClient.del(channel);
	}

	/**
	 * shutdown - Shutdown events module
	 */
	public override async shutdown() {
		await super.shutdown();

		if (this.pubClient) await this.pubClient.quit();
		if (this.subClient) await this.subClient.quit();

		this.subscriptions = {};
		this.scheduleCallbacks = {};
	}
}

export type EventsModuleJobs = {
	[Property in keyof UniqueMethods<EventsModule>]: {
		payload: Parameters<UniqueMethods<EventsModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<EventsModule>[Property]>>;
	};
};
