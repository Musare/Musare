import config from "config";
import { RedisClientType, createClient } from "redis";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import { UniqueMethods } from "@/types/Modules";

export class CacheModule extends BaseModule {
	private _redisClient?: RedisClientType;

	/**
	 * Cache Module
	 */
	public constructor() {
		super("cache");
	}

	/**
	 * startup - Startup cache module
	 */
	public override async startup() {
		await super.startup();

		// @ts-ignore
		this._redisClient = createClient({
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

		this._redisClient.on("error", error => {
			this.log({ type: "error", message: error.message, data: error });

			this.setStatus(ModuleStatus.ERROR);
		});

		this._redisClient.on("ready", () => {
			this.log({ type: "debug", message: "Redis connection ready" });

			if (this.getStatus() === ModuleStatus.ERROR)
				this.setStatus(ModuleStatus.STARTED);
		});

		await this._redisClient.connect();

		const redisConfigResponse = await this._redisClient.sendCommand([
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

		await super._started();
	}

	/**
	 * shutdown - Shutdown cache module
	 */
	public override async shutdown() {
		await super.shutdown();
		if (this._redisClient) await this._redisClient.quit();
		await this._stopped();
	}

	public canRunJobs(): boolean {
		return this._redisClient?.isReady === true && super.canRunJobs();
	}

	public async getKeys(pattern: string) {
		return this._redisClient!.KEYS(pattern);
	}

	public async get(key: string) {
		const value = await this._redisClient!.GET(key);

		return value === null ? null : JSON.parse(value);
	}

	public async set(key: string, value: any, ttl?: number) {
		await this._redisClient!.SET(key, JSON.stringify(value), { EX: ttl });
	}

	public async remove(key: string) {
		await this._redisClient!.DEL(key);
	}

	public async removeMany(keys: string | string[]) {
		await Promise.all(
			(Array.isArray(keys) ? keys : [keys]).map(async pattern => {
				for await (const key of this._redisClient!.scanIterator({
					MATCH: pattern
				})) {
					await this.remove(key);
				}
			})
		);
	}

	public async getTtl(key: string) {
		return this._redisClient!.TTL(key);
	}

	public async getTable(key: string) {
		return this._redisClient!.HGETALL(key);
	}

	public async getTableItem(table: string, key: string) {
		return this._redisClient!.HGET(table, key);
	}

	public async setTableItem(table: string, key: string, value: any) {
		return this._redisClient!.HSET(table, key, value);
	}

	public async removeTableItem(table: string, key: string) {
		return this._redisClient!.HDEL(table, key);
	}
}

export type CacheModuleJobs = {
	[Property in keyof UniqueMethods<CacheModule>]: {
		payload: Parameters<UniqueMethods<CacheModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<CacheModule>[Property]>>;
	};
};

export default new CacheModule();
