import async from "async";
import config from "config";
import mongoose, { Schema } from "mongoose";
import hash from "object-hash";
import { createClient, RedisClientType } from "redis";
import JobContext from "src/JobContext";
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
							await async.each(
								Object.values(this.collections),
								async collection =>
									collection.model.syncIndexes()
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
				.then(async () => {
					// TODO: Ensure the following shutdown correctly
					if (this.redis) await this.redis.quit();
					await mongoose.connection.close(false);
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

	// TODO split core into parseDocument(document, schema, { partial: boolean;  })
	/**
	 * parseQuery - Ensure validity of query and return a mongo query, or the document itself re-constructed
	 *
	 * @param query - Query
	 * @param schema - Schema of collection document
	 * @param options - Parser options
	 * @returns Promise returning object with query values cast to schema types
	 * 			and whether query includes restricted attributes
	 */
	private async parseQuery(
		query: any,
		schema: any,
		options?: {
			operators?: boolean;
		}
	): Promise<{ castQuery: any; restricted: boolean }> {
		if (!query || typeof query !== "object")
			throw new Error("Invalid query provided. Query must be an object.");

		const keys = Object.keys(query);
		if (keys.length === 0)
			throw new Error("Invalid query provided. Query must contain keys.");

		// Whether to parse operators or not
		const operators = !(options && options.operators === false);
		// The MongoDB query we're building
		const castQuery: any = {};
		// If the query references any fields that are restricted, this will be true, so that find knows not to cache the query object
		let restricted = false;

		// Operators at the key level that we support right now
		const allowedKeyOperators = ["$or", "$and"];
		// Operators at the value level that we support right now
		const allowedValueOperators = ["$in"];

		await async.each(Object.entries(query), async ([key, value]) => {
			// Key must be 1 character and exist
			if (!key || key.length === 0)
				throw new Error(
					`Invalid query provided. Key must be at least 1 character.`
				);

			// Handle key operators, which always start with a $
			if (operators && key[0] === "$") {
				// Operator isn't found, so throw an error
				if (allowedKeyOperators.indexOf(key) === -1)
					throw new Error(
						`Invalid query provided. Operator "${key}" is not allowed.`
					);

				// We currently only support $or and $and, but here we can have different logic for different operators
				if (key === "$or" || key === "$and") {
					// $or and $and should always be an array, so check if it is
					if (!Array.isArray(value) || value.length === 0)
						throw new Error(
							`Key "${key}" must contain array of queries.`
						);

					// Add the operator to the mongo query object as an empty array
					castQuery[key] = [];

					// Run parseQuery again for child objects and add them to the mongo query operator array
					await async.each(value, async _value => {
						const {
							castQuery: _castQuery,
							restricted: _restricted
						} = await this.parseQuery(_value, schema, options);

						// Actually add the returned query object to the mongo query we're building
						castQuery[key].push(_castQuery);
						if (_restricted) restricted = true;
					});
				} else
					throw new Error(
						`Unhandled operator "${key}", this should never happen!`
					);
			} else {
				// Here we handle any normal keys in the query object

				// If the key doesn't exist in the schema, throw an error
				if (!Object.hasOwn(schema, key))
					throw new Error(
						`Key "${key} does not exist in the schema."`
					);

				// If the key in the schema is marked as restricted, mark the entire query as restricted
				if (schema[key].restricted) restricted = true;

				// Type will be undefined if it's a nested object
				if (schema[key].type === undefined) {
					// Run parseQuery on the nested schema object
					const { castQuery: _castQuery, restricted: _restricted } =
						await this.parseQuery(value, schema[key], options);
					castQuery[key] = _castQuery;
					if (_restricted) restricted = true;
				} else if (
					operators &&
					typeof value === "object" &&
					value &&
					Object.keys(value).length === 1 &&
					Object.keys(value)[0] &&
					Object.keys(value)[0][0] === "$"
				) {
					// This entire if statement is for handling value operators

					// Operator isn't found, so throw an error
					if (allowedValueOperators.indexOf(key) === -1)
						throw new Error(
							`Invalid query provided. Operator "${key}" is not allowed.`
						);

					// Handle the $in value operator
					if (value.$in) {
						castQuery[key] = {
							$in: []
						};

						if (value.$in.length > 0)
							castQuery[key].$in = await async.map(
								value.$in,
								async (_value: any) => {
									if (
										typeof schema[key].type === "function"
									) {
										const Type = schema[key].type;
										const castValue = new Type(_value);
										if (schema[key].validate)
											await schema[key]
												.validate(castValue)
												.catch(err => {
													throw new Error(
														`Invalid value for ${key}, ${err}`
													);
												});
										return castValue;
									}
									throw new Error(
										`Invalid schema type for ${key}`
									);
								}
							);
					} else
						throw new Error(
							`Unhandled operator "${
								Object.keys(value)[0]
							}", this should never happen!`
						);
				} else if (typeof schema[key].type === "function") {
					const Type = schema[key].type;
					const castValue = new Type(value);
					if (schema[key].validate)
						await schema[key].validate(castValue).catch(err => {
							throw new Error(`Invalid value for ${key}, ${err}`);
						});
					castQuery[key] = castValue;
				} else throw new Error(`Invalid schema type for ${key}`);
			}
		});

		return { castQuery, restricted };
	}

	// TODO hide sensitive fields
	// TODO improve caching
	// TODO add option to only request certain fields
	// TODO add support for computed fields
	// TODO parse query - validation
	// TODO add proper typescript support
	// TODO add proper jsdoc
	// TODO add support for enum document attributes
	// TODO add support for array document attributes
	// TODO add support for reference document attributes
	// TODO prevent caching if requiring restricted values
	// TODO fix 2nd layer of schema
	/**
	 * find - Get one or more document(s) from a single collection
	 *
	 * @param payload - Payload
	 * @returns Returned object
	 */
	public find<T extends keyof Collections>(
		context: JobContext,
		{
			collection, // Collection name
			query, // Similar to MongoDB query
			values, // TODO: Add support
			limit = 1, // TODO have limit off by default?
			page = 1,
			useCache = true
		}: {
			collection: T;
			query: Record<string, any>;
			values?: Record<string, any>;
			limit?: number;
			page?: number;
			useCache?: boolean;
		}
	): Promise<any | null> {
		return new Promise((resolve, reject) => {
			let queryHash: string | null = null;
			let cacheable = useCache !== false;

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
					async () =>
						this.parseQuery(
							query,
							this.collections![collection].schema.document
						),

					// If we can use cache, get from the cache, and if we get results return those
					async ({ castQuery, restricted }: any) => {
						// If we're allowed to cache, and the query doesn't reference any restricted fields, try to cache the query and its response
						if (cacheable && !restricted) {
							// Turn the query object into a sha1 hash that can be used as a Redis key
							queryHash = hash(
								{ collection, castQuery, values, limit, page },
								{
									algorithm: "sha1"
								}
							);
							// Check if the query hash already exists in Redis, and get it if it is
							const cachedQuery = await this.redis?.GET(
								`query.find.${queryHash}`
							);

							// Return the castQuery along with the cachedDocuments, if any
							return {
								castQuery,
								cachedDocuments: cachedQuery
									? JSON.parse(cachedQuery)
									: null
							};
						}

						return { castQuery, cachedDocuments: null };
					},

					// If we didn't get documents from the cache, get them from mongo
					async ({ castQuery, cachedDocuments }: any) => {
						if (cachedDocuments) {
							cacheable = false;
							return cachedDocuments;
						}
						const getFindValues = async (object: any) => {
							const find: any = {};
							await async.each(
								Object.entries(object),
								async ([key, value]) => {
									if (
										value.type === undefined &&
										Object.keys(value).length > 0
									) {
										const _find = await getFindValues(
											value
										);
										if (Object.keys(_find).length > 0)
											find[key] = _find;
									} else if (!value.restricted)
										find[key] = true;
								}
							);
							return find;
						};
						const find: any = await getFindValues(
							this.collections![collection].schema.document
						);
						return this.collections?.[collection].model
							.find(castQuery, find)
							.limit(limit)
							.skip((page - 1) * limit);
					},

					// Convert documents from Mongoose model to regular objects
					async (documents: any[]) =>
						async.map(documents, async (document: any) => {
							const { castQuery } = await this.parseQuery(
								document._doc || document,
								this.collections![collection].schema.document,
								{ operators: false }
							);
							return castQuery;
						}),

					// Add documents to the cache
					async (documents: any[]) => {
						// Adds query results to cache but doesnt await
						if (cacheable && queryHash) {
							this.redis!.SET(
								`query.find.${queryHash}`,
								JSON.stringify(documents),
								{
									EX: 60
								}
							);
						}
						return documents;
					}
				],
				(err, documents?: any[]) => {
					if (err) reject(err);
					else if (!documents || documents!.length === 0)
						resolve(limit === 1 ? null : []);
					else resolve(limit === 1 ? documents![0] : documents);
				}
			);
		});
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
