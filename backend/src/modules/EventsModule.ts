import { createClient, RedisClientType } from "redis";
import config from "config";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import WebSocketModule from "./WebSocketModule";

export class EventsModule extends BaseModule {
	private _pubClient?: RedisClientType;

	private _subClient?: RedisClientType;

	private _subscriptions: Record<string, ((message: any) => Promise<void>)[]>;

	private _pSubscriptions: Record<
		string,
		((message: any) => Promise<void>)[]
	>;

	private _socketSubscriptions: Record<string, Set<string>>;

	private _scheduleCallbacks: Record<string, (() => Promise<void>)[]>;

	/**
	 * Events Module
	 */
	public constructor() {
		super("events");

		this._subscriptions = {};
		this._pSubscriptions = {};
		this._socketSubscriptions = {};
		this._scheduleCallbacks = {};
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
		this._pubClient = createClient({
			...config.get("redis"),
			reconnectStrategy: (retries: number, error) => {
				if (
					retries >= 10 ||
					![ModuleStatus.STARTING, ModuleStatus.STARTED].includes(
						this.getStatus()
					)
				)
					return false;

				this.log({
					type: "debug",
					message: `Redis reconnect attempt ${retries}`,
					data: error
				});

				return Math.min(retries * 50, 500);
			}
		});

		this._pubClient.on("error", error => {
			this.log({ type: "error", message: error.message, data: error });

			this.setStatus(ModuleStatus.ERROR);
		});

		this._pubClient.on("ready", () => {
			this.log({ type: "debug", message: "Redis connection ready" });

			if (this.getStatus() === ModuleStatus.ERROR)
				this.setStatus(ModuleStatus.STARTED);
		});

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

		this._subClient.on("error", error => {
			this.log({ type: "error", message: error.message, data: error });

			this.setStatus(ModuleStatus.ERROR);
		});

		this._subClient.on("ready", () => {
			this.log({ type: "debug", message: "Redis connection ready" });

			if (this.getStatus() === ModuleStatus.ERROR)
				this.setStatus(ModuleStatus.STARTED);
		});

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

		return `${type}.${channel}`;
	}

	/**
	 * publish - Publish an event
	 */
	public async publish(channel: string, value: any) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		if (!value) throw new Error("Invalid value");

		if (["object", "array"].includes(typeof value))
			value = JSON.stringify(value);

		await this._pubClient.publish(this._createKey("event", channel), value);
	}

	/**
	 * subscriptionListener - Listener for event subscriptions
	 */
	private async _subscriptionListener(message: string, key: string) {
		const [, channel] = key.split(".");

		if (message.startsWith("[") || message.startsWith("{"))
			try {
				message = JSON.parse(message);
			} catch (err) {
				console.error(err);
			}
		else if (message.startsWith('"') && message.endsWith('"'))
			message = message.substring(1).substring(0, message.length - 2);

		if (this._subscriptions && this._subscriptions[channel])
			await Promise.all(
				this._subscriptions[channel].map(async cb => cb(message))
			);

		if (this._pSubscriptions)
			await Promise.all(
				Object.entries(this._pSubscriptions)
					.filter(([subscription]) =>
						new RegExp(channel).test(subscription)
					)
					.map(async ([, callbacks]) =>
						Promise.all(callbacks.map(async cb => cb(message)))
					)
			);

		if (!this._socketSubscriptions[channel]) return;

		for await (const socketId of this._socketSubscriptions[
			channel
		].values()) {
			await WebSocketModule.dispatch(socketId, channel, message);
		}
	}

	/**
	 * subscribe - Subscribe to an event or schedule completion
	 */
	public async subscribe(
		type: "event" | "schedule",
		channel: string,
		callback: (message?: any) => Promise<void>
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		if (type === "schedule") {
			if (!this._scheduleCallbacks[channel])
				this._scheduleCallbacks[channel] = [];

			this._scheduleCallbacks[channel].push(() => callback());

			return;
		}

		if (!this._subscriptions[channel]) {
			this._subscriptions[channel] = [];

			await this._subClient.subscribe(
				this._createKey(type, channel),
				(...args) => this._subscriptionListener(...args)
			);
		}

		this._subscriptions[channel].push(callback);
	}

	/**
	 * pSubscribe - Subscribe to an event with pattern
	 */
	public async pSubscribe(
		pattern: string,
		callback: (message?: any) => Promise<void>
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		if (!this._pSubscriptions[pattern]) {
			this._pSubscriptions[pattern] = [];

			await this._subClient.pSubscribe(
				this._createKey("event", pattern),
				(...args) => this._subscriptionListener(...args)
			);
		}

		this._pSubscriptions[pattern].push(callback);
	}

	/**
	 * unsubscribe - Unsubscribe from an event or schedule completion
	 */
	public async unsubscribe(
		type: "event" | "schedule",
		channel: string,
		callback: (message?: any) => Promise<void>
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		if (type === "schedule") {
			if (!this._scheduleCallbacks[channel]) return;

			const index = this._scheduleCallbacks[channel].findIndex(
				schedule => schedule.toString() === callback.toString()
			);

			if (index >= 0) this._scheduleCallbacks[channel].splice(index, 1);

			return;
		}

		if (!this._subscriptions[channel]) return;

		const index = this._subscriptions[channel].findIndex(
			subscription => subscription.toString() === callback.toString()
		);

		if (index < 0) return;

		this._subscriptions[channel].splice(index, 1);

		if (this._subscriptions[channel].length === 0) {
			delete this._subscriptions[channel];
			await this._subClient.unsubscribe(this._createKey(type, channel)); // TODO: Provide callback when unsubscribing
		}
	}

	/**
	 * schedule - Schedule a callback trigger
	 */
	public async schedule(channel: string, time: number) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		if (typeof time !== "number") throw new Error("Time must be a number");

		time = Math.round(time);

		if (time <= 0) throw new Error("Time must be greater than 0");

		await this._pubClient.set(this._createKey("schedule", channel), "", {
			PX: time,
			NX: true
		});
	}

	/**
	 * unschedule - Unschedule a callback trigger
	 */
	public async unschedule(channel: string) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		await this._pubClient.del(this._createKey("schedule", channel));
	}

	public async subscribeSocket(channel: string, socketId: string) {
		if (!this._socketSubscriptions[channel]) {
			await this.subscribe("event", channel, () => {});

			this._socketSubscriptions[channel] = new Set();
		}

		if (this._socketSubscriptions[channel].has(socketId)) return;

		this._socketSubscriptions[channel].add(socketId);
	}

	public async subscribeManySocket(channels: string[], socketId: string) {
		await Promise.all(
			channels.map(channel => this.subscribeSocket(channel, socketId))
		);
	}

	public async unsubscribeSocket(channel: string, socketId: string) {
		if (
			!(
				this._socketSubscriptions[channel] &&
				this._socketSubscriptions[channel].has(socketId)
			)
		)
			return;

		this._socketSubscriptions[channel].delete(socketId);

		if (this._socketSubscriptions[channel].size === 0)
			delete this._socketSubscriptions[channel];
	}

	public async unsubscribeManySocket(channels: string[], socketId: string) {
		await Promise.all(
			channels.map(channel => this.unsubscribeSocket(channel, socketId))
		);
	}

	public async unsubscribeAllSocket(socketId: string) {
		await Promise.all(
			Object.entries(this._socketSubscriptions)
				.filter(([, socketIds]) => socketIds.has(socketId))
				.map(async ([channel]) =>
					this.unsubscribeSocket(channel, socketId)
				)
		);
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

export default new EventsModule();
