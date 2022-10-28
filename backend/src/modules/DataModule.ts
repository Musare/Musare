import async from "async";
import config from "config";
import mongoose, { Schema } from "mongoose";
import { createClient, RedisClientType } from "redis";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";
import { UniqueMethods } from "../types/Modules";
import { Collections } from "../types/Collections";

export default class DataModule extends BaseModule {
	collections?: Collections;

	redis?: RedisClientType;

	/**
	 * Data Module
	 *
	 * @param {ModuleManager} moduleManager Module manager class
	 */
	public constructor(moduleManager: ModuleManager) {
		super(moduleManager, "data");
	}

	/**
	 * startup - Startup data module
	 */
	public override startup(): Promise<void> {
		return new Promise((resolve, reject) => {
			async.waterfall(
				[
					(next: any) => {
						super
							.startup()
							.then(() => next())
							.catch(next);
					},

					(next: any) => {
						const mongoUrl = config.get<any>("mongo").url;
						mongoose
							.connect(mongoUrl)
							.then(() => {
								this.loadCollections().then(() => {
									if (this.collections) {
										Object.values(this.collections).forEach(
											collection =>
												collection.model.syncIndexes()
										);
										next();
									} else
										next(
											new Error(
												"Collections have not been loaded"
											)
										);
								});
							})
							.catch(next);
					},

					(next: any) => {
						const { url, password } = config.get<any>("redis");
						this.redis = createClient({
							url,
							password
						});
						this.redis
							.connect()
							.then(() => next())
							.catch(next);
					},

					(next: any) => {
						if (this.redis)
							this.redis
								.sendCommand([
									"CONFIG",
									"GET",
									"notify-keyspace-events"
								])
								.then(res => {
									if (
										!(Array.isArray(res) && res[1] === "xE")
									)
										next(
											new Error(
												`notify-keyspace-events is NOT configured correctly! It is set to: ${
													(Array.isArray(res) &&
														res[1]) ||
													"unknown"
												}`
											)
										);
									else next();
								})
								.catch(next);
						else
							next(new Error("Redis connection not established"));
					},

					(next: any) => {
						super.started();
						next();
					}
				],
				err => {
					if (err) reject(err);
					else resolve();
				}
			);
		});
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override shutdown(): Promise<void> {
		return new Promise(resolve => {
			super
				.shutdown()
				.then(() => {
					// TODO: Ensure the following shutdown correctly
					if (this.redis) this.redis.disconnect();
					mongoose.connection.close(false);
				})
				.finally(() => resolve());
		});
	}

	/**
	 * loadColllection - Import and load collection schema
	 *
	 * @param {string} collectionName Name of the collection
	 * @returns {Collections[T]} Collection
	 */
	private loadCollection<T extends keyof Collections>(
		collectionName: T
	): Promise<Collections[T]> {
		return new Promise(resolve => {
			import(`../collections/${collectionName.toString()}`).then(
				({ schema }: { schema: Collections[T]["schema"] }) => {
					const mongoSchema = new Schema<
						Collections[T]["schema"]["document"]
					>(schema.document, {
						timestamps: schema.timestamps
					});
					const model = mongoose.model(
						collectionName.toString(),
						mongoSchema
					);
					// @ts-ignore
					resolve({
						// @ts-ignore
						schema,
						// @ts-ignore
						model
					});
				}
			);
		});
	}

	/**
	 * loadCollections - Load and initialize all collections
	 *
	 * @returns {Promise} Promise
	 */
	private loadCollections(): Promise<void> {
		return new Promise((resolve, reject) => {
			const fetchCollections = async () => ({
				abc: await this.loadCollection("abc")
			});
			fetchCollections()
				.then(collections => {
					this.collections = collections;
					resolve();
				})
				.catch(err => {
					reject(new Error(err));
				});
		});
	}

	/**
	 * find - Find data
	 *
	 * @param {object} payload Payload
	 * @param {string} payload.collection Name of collection to fetch from
	 * @param {object} payload.query Query
	 * @param {object} payload.values Return specific values
	 * @param {number} payload.limit Returned data limit
	 * @param {number} payload.cache Cache expiry in seconds (-1 to disable)
	 * @returns {Promise} Return object
	 */
	public find<T extends keyof Collections>({
		collection,
		query,
		values, // TODO: Add support
		limit = 1, // TODO: Add pagination
		cache = 60
	}: {
		collection: T;
		query: Record<string, any>;
		values?: Record<string, any>;
		limit?: number;
		cache?: number;
	}): Promise<any> {
		return new Promise((resolve, reject) => {
			if (
				this.redis &&
				this.collections &&
				this.collections[collection]
			) {
				async.waterfall(
					[
						(next: any) => {
							const idsProvided: any = []; // TODO: Handle properly (e.g. one missing $in causes duplicate or many queries with mixed/no _id)
							(
								(query._id && query._id.$in) || [query._id]
							).forEach((queryId: any) =>
								idsProvided.push(queryId.toString())
							);
							const cached: any = [];
							if (cache === -1 || idsProvided.length === 0)
								next(null, cached, idsProvided);
							else {
								async.each(
									idsProvided,
									(queryId, _next) => {
										this.redis
											?.GET(`${collection}.${queryId}`)
											.then((cacheValue: any) => {
												if (cacheValue)
													cached.push(
														JSON.parse(cacheValue) // TODO: Convert _id to ObjectId
													);
												_next();
											})
											.catch(_next);
									},
									err => next(err, cached, idsProvided)
								);
							}
						},

						(cached: any, idsProvided: any, next: any) => {
							if (idsProvided.length === cached.length)
								next(null, [], cached);
							else
								this.collections?.[collection].model
									.find(query)
									.limit(limit)
									.exec((err: any, res: any) => {
										if (
											err ||
											(res.length === 0 &&
												cached.length === 0)
										)
											next(
												new Error(
													err || "No results found"
												)
											);
										else {
											next(null, res, cached);
										}
									});
						},

						(response: any, cached: any, next: any) => {
							if (cache > -1 && response.length > 0)
								async.each(
									response,
									(res: any, _next) => {
										this.redis
											?.SET(
												`${collection}.${res._id.toString()}`,
												JSON.stringify(res)
											)
											.then(() => {
												this.redis
													?.EXPIRE(
														`${collection}.${res._id.toString()}`,
														cache
													)
													.then(() => _next())
													.catch(_next);
											})
											.catch(_next);
									},
									err => next(err, [...response, ...cached])
								);
							else next(null, [...response, ...cached]);
						}
					],
					(err, res: any) => {
						if (err) reject(err);
						else resolve(res.length === 1 ? res[0] : res);
					}
				);
			} else reject(new Error(`Collection "${collection}" not loaded`));
		});
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[0];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
