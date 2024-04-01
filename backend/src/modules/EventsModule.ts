import {
	createClient,
	RedisClientOptions,
	RedisClientType,
	RedisDefaultModules,
	RedisFunctions,
	RedisModules,
	RedisScripts
} from "redis";
import config from "config";
import { forEachIn } from "@common/utils/forEachIn";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import WebSocketModule from "./WebSocketModule";
import Event from "@/modules/EventsModule/Event";
import ModuleManager from "@/ModuleManager";

export class EventsModule extends BaseModule {
	private _pubClient?: RedisClientType<
		RedisDefaultModules & RedisModules,
		RedisFunctions,
		RedisScripts
	>;

	private _subClient?: RedisClientType<
		RedisDefaultModules & RedisModules,
		RedisFunctions,
		RedisScripts
	>;

	private _subscriptions: Record<string, ((message: any) => Promise<void>)[]>;

	private _pSubscriptions: Record<
		string,
		((event: Event) => Promise<void>)[]
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
			...config.get<RedisClientOptions>("redis"),
			socket: {
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

		await this._subClient.pSubscribe("event.*", async (...args) =>
			this._subscriptionListener(...args)
		);

		await this._subClient.pSubscribe(
			`__keyevent@${database}__:expired`,
			async message => {
				const type = message.substring(0, message.indexOf("."));

				if (type !== "schedule") return;

				const channel = message.substring(message.indexOf(".") + 1);

				if (!this._scheduleCallbacks[channel]) return;

				await forEachIn(this._scheduleCallbacks[channel], callback =>
					callback()
				);
			}
		);
	}

	public getEvent(path: string) {
		const moduleName = path.substring(0, path.indexOf("."));
		const eventName = path.substring(path.indexOf(".") + 1);

		if (moduleName === this._name) return super.getEvent(eventName);

		const module = ModuleManager.getModule(moduleName);
		if (!module) throw new Error(`Module "${moduleName}" not found`);

		return module.getEvent(eventName);
	}

	public getAllEvents() {
		return Object.fromEntries(
			Object.entries(ModuleManager.getModules() ?? {}).map(
				([name, module]) => [name, Object.keys(module.getEvents())]
			)
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
	public async publish(event: Event) {
		if (!this._pubClient) throw new Error("Redis pubClient unavailable.");

		const channel = event.getKey();
		const value = event.makeMessage();

		await this._pubClient.publish(this._createKey("event", channel), value);
	}

	/**
	 * subscriptionListener - Listener for event subscriptions
	 */
	private async _subscriptionListener(message: string, key: string) {
		const type = key.substring(0, key.indexOf("."));

		if (type !== "event") return;

		key = key.substring(key.indexOf(".") + 1);

		const { path, scope } = Event.parseKey(key);
		const EventClass = this.getEvent(path);
		const parsedMessage = Event.parseMessage(message);
		const event = new EventClass(parsedMessage, scope);

		if (this._subscriptions && this._subscriptions[key])
			await forEachIn(this._subscriptions[key], async cb => cb(event));

		if (this._pSubscriptions)
			await forEachIn(
				Object.entries(this._pSubscriptions).filter(([subscription]) =>
					new RegExp(subscription).test(key)
				),
				async ([, callbacks]) =>
					forEachIn(callbacks, async cb => cb(event))
			);

		if (!this._socketSubscriptions[key]) return;

		for await (const socketId of this._socketSubscriptions[key].values()) {
			await WebSocketModule.dispatch(socketId, key, event.getData());
		}
	}

	/**
	 * subscribe - Subscribe to an event or schedule completion
	 */
	public async subscribe(
		EventClass: any,
		callback: (message?: any) => Promise<void>,
		scope?: string
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		const key = EventClass.getKey(scope);
		const type = EventClass.getType();

		if (type === "schedule") {
			if (!this._scheduleCallbacks[key])
				this._scheduleCallbacks[key] = [];

			this._scheduleCallbacks[key].push(() => callback());

			return;
		}

		if (!this._subscriptions[key]) this._subscriptions[key] = [];

		this._subscriptions[key].push(callback);
	}

	/**
	 * pSubscribe - Subscribe to an event with pattern
	 */
	public async pSubscribe(
		pattern: string,
		callback: (event: Event) => Promise<void>
	) {
		if (!this._subClient) throw new Error("Redis subClient unavailable.");

		if (!this._pSubscriptions[pattern]) this._pSubscriptions[pattern] = [];

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

		if (this._subscriptions[channel].length === 0)
			delete this._subscriptions[channel];
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
			this._socketSubscriptions[channel] = new Set();
		}

		if (this._socketSubscriptions[channel].has(socketId)) return;

		this._socketSubscriptions[channel].add(socketId);
	}

	public async subscribeManySocket(channels: string[], socketId: string) {
		await forEachIn(channels, channel =>
			this.subscribeSocket(channel, socketId)
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
		await forEachIn(channels, channel =>
			this.unsubscribeSocket(channel, socketId)
		);
	}

	public async unsubscribeAllSocket(socketId: string) {
		await forEachIn(
			Object.entries(this._socketSubscriptions).filter(([, socketIds]) =>
				socketIds.has(socketId)
			),
			async ([channel]) => this.unsubscribeSocket(channel, socketId)
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
