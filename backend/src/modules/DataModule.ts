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
	 * @param moduleManager - Module manager class
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
					async () => super.startup(),

					async () => {
						const mongoUrl = config.get<string>("mongo.url");

						return mongoose.connect(mongoUrl);
					},

					async () => this.loadCollections(),

					async () => {
						if (this.collections) {
							Object.values(this.collections).forEach(
								collection => collection.model.syncIndexes()
							);
						} else
							throw new Error("Collections have not been loaded");
					},

					async () => {
						const { url, password } = config.get<{
							url: string;
							password: string;
						}>("redis");

						this.redis = createClient({
							url,
							password
						});

						return this.redis.connect();
					},

					async () => {
						if (!this.redis)
							throw new Error("Redis connection not established");

						return this.redis.sendCommand([
							"CONFIG",
							"GET",
							"notify-keyspace-events"
						]);
					},

					async (redisConfigResponse: string[]) => {
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
					},

					async () => super.started()
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
	 * @param collectionName - Name of the collection
	 * @returns Collection
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
	 * @returns Promise
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

	// TODO decide on whether to throw an exception if no results found, possible configurable via param
	// TODO hide sensitive fields
	// TOOD don't store sensitive fields in cache
	// TODO improve caching
	// TODO add option to only request certain fields
	// TODO add support for computed fields
	// TODO parse query
	// TODO add proper typescript support
	// TODO add proper jsdoc
	/**
	 * find - Find data
	 *
	 * @param payload - Payload
	 * @returns Returned object
	 */
	public find<T extends keyof Collections>({
		collection,
		query,
		values, // TODO: Add support
		limit = 1, // TODO have limit off by default?
		page = 1,
		useCache = true,
		convertArrayToSingle = false
	}: {
		collection: T;
		query: Record<string, any>;
		values?: Record<string, any>;
		limit?: number;
		page?: number;
		useCache?: boolean;
		convertArrayToSingle?: boolean;
	}): Promise<any> {
		return new Promise((resolve, reject) => {
			let addToCache = false;
			let cacheKeyName: string | null = null;

			async.waterfall(
				[
					// Verify whether the collection exists
					async () => {
						if (!collection)
							throw new Error("No collection specified");
						if (this.collections && !this.collections[collection])
							throw new Error("Collection not found");
					},

					// Verify whether the query is valid-enough to continue
					async () => {
						if (
							!query ||
							typeof query !== "object" ||
							Object.keys(query).length === 0
						)
							new Error(
								"Invalid query provided. Query must be an object."
							);
					},

					// If we can use cache, get from the cache, and if we get results return those, otherwise return null
					async () => {
						// Not using cache, so return
						if (!useCache) return null;
						// More than one query key, so impossible to get from cache
						if (Object.keys(query).length > 1) return null;

						// First key and only key in query object
						const queryPropertyName = Object.keys(query)[0];
						// Corresponding property from schema document
						const documentProperty =
							this.collections![collection].schema.document[
								queryPropertyName
							];

						if (!documentProperty)
							throw new Error(
								`Query property ${queryPropertyName} not found in document.`
							);
						// If query name is not a cache key, just continue
						if (!documentProperty.cacheKey) return null;

						const values = [];
						if (
							Object.prototype.hasOwnProperty.call(
								query[queryPropertyName],
								"$in"
							)
						)
							values.push(...query[queryPropertyName].$in);
						else values.push(query[queryPropertyName]);

						const cachedDocuments: any[] = [];

						await async.each(values, async value =>
							this.redis
								?.GET(
									`${collection}.${queryPropertyName}.${value.toString()}`
								)
								.then((cachedDocument: any) => {
									if (cachedDocument)
										cachedDocuments.push(
											JSON.parse(cachedDocument)
										);
								})
						);

						// TODO optimize this
						if (cachedDocuments.length !== values.length) {
							addToCache = true;
							cacheKeyName = queryPropertyName;
							return null;
						}

						return cachedDocuments;
					},

					// If we didn't get documents from the cache, get them from mongo
					async (cachedDocuments: any[] | null) => {
						if (cachedDocuments) return cachedDocuments;

						return this.collections?.[collection].model
							.find(query)
							.limit(limit)
							.skip((page - 1) * limit);
					},

					// Convert documents from Mongoose model to regular objects, and if we got no documents throw an error
					async (documents: any[]) => {
						if (documents.length === 0)
							throw new Error("No results found.");

						return documents.map(document => {
							if (!document._doc) return document;

							const rawDocument = document._doc;
							rawDocument._id = rawDocument._id.toString();
							return rawDocument;
						});
					},

					// Add documents to the cache
					async (documents: any[]) => {
						// TODO only add new things to cache
						// Adds the fetched documents to the cache, but doesn't wait for it to complete
						if (addToCache && cacheKeyName) {
							async.each(
								documents,
								// TODO verify that the cache key name property actually exists for these documents
								async (document: any) =>
									this.redis!.SET(
										`${collection}.${cacheKeyName}.${document[
											cacheKeyName!
										].toString()}`,
										JSON.stringify(document),
										{
											EX: 60
										}
									)
							);
						}

						return documents;
					}
				],
				(err, documents?: any[]) => {
					if (err) reject(err);
					else if (convertArrayToSingle)
						resolve(
							documents!.length === 1 ? documents![0] : documents
						);
					else resolve(documents);
				}
			);
		});
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[0];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
