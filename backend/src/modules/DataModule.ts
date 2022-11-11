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

	/**
	 * Strip a document object from any unneeded properties, or of any restricted properties
	 * 
	 * @param document The document object
	 * @param schema The schema object
	 * @param projection The project, which can be null
	 * @returns 
	 */
	private async stripDocument(
		document: any,
		schema: any,
		projection: any
	) {
		const allowedByProjection = (property: string) => {
			if (Array.isArray(projection)) return projection.indexOf(property) !== -1;
			else if (typeof property === "object") !!projection[property];
			else return false;
		}

		const unfilteredEntries = Object.entries(document);
		const filteredEntries = await async.filter(unfilteredEntries, async ([key, value]) => {
			if (!schema[key]) return false;
			if (projection) return allowedByProjection(key);
			else {
				if (schema[key].restricted) return false;
				return true;
			}
		});
		
		return Object.fromEntries(filteredEntries);
	}

	/**
	 * parseFindFilter - Ensure validity of filter and return a mongo filter ---, or the document itself re-constructed
	 *
	 * @param filter - Filter
	 * @param schema - Schema of collection document
	 * @param options - Parser options
	 * @returns Promise returning object with query values cast to schema types
	 * 			and whether query includes restricted attributes
	 */
	private async parseFindFilter(
		filter: any,
		schema: any,
		options?: {
			operators?: boolean;
		}
	): Promise<{ mongoFilter: any; containsRestrictedProperties: boolean, canCache: boolean }> {
		if (!filter || typeof filter !== "object")
			throw new Error("Invalid filter provided. Filter must be an object.");

		const keys = Object.keys(filter);
		if (keys.length === 0)
			throw new Error("Invalid filter provided. Filter must contain keys.");

		// Whether to parse operators or not
		const operators = !(options && options.operators === false);
		// The MongoDB filter we're building
		const mongoFilter: any = {};
		// If the filter references any properties that are restricted, this will be true, so that find knows not to cache the query object
		let containsRestrictedProperties = false;
		// Whether this filter is cachable or not
		let canCache = true;

		// Operators at the key level that we support right now
		const allowedKeyOperators = ["$or", "$and"];
		// Operators at the value level that we support right now
		const allowedValueOperators = ["$in"];

		// Loop through all key/value properties
		await async.each(Object.entries(filter), async ([key, value]) => {
			// Key must be 1 character and exist
			if (!key || key.length === 0)
				throw new Error(
					`Invalid filter provided. Key must be at least 1 character.`
				);

			// Handle key operators, which always start with a $
			if (operators && key[0] === "$") {
				// Operator isn't found, so throw an error
				if (allowedKeyOperators.indexOf(key) === -1)
					throw new Error(
						`Invalid filter provided. Operator "${key}" is not allowed.`
					);

				// We currently only support $or and $and, but here we can have different logic for different operators
				if (key === "$or" || key === "$and") {
					// $or and $and should always be an array, so check if it is
					if (!Array.isArray(value) || value.length === 0)
						throw new Error(
							`Key "${key}" must contain array of queries.`
						);

					// Add the operator to the mongo filter object as an empty array
					mongoFilter[key] = [];

					// Run parseFindQuery again for child objects and add them to the mongo query operator array
					await async.each(value, async _value => {
						const {
							mongoFilter: _mongoFilter,
							containsRestrictedProperties: _containsRestrictedProperties
						} = await this.parseFindFilter(_value, schema, options);

						// Actually add the returned filter object to the mongo query we're building
						mongoFilter[key].push(_mongoFilter);
						if (_containsRestrictedProperties) containsRestrictedProperties = true;
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

				// If the key in the schema is marked as restricted, containsRestrictedProperties will be true
				if (schema[key].restricted) containsRestrictedProperties = true;

				// Type will be undefined if it's a nested object
				if (schema[key].type === undefined) {
					// Run parseFindFilter on the nested schema object
					const { mongoFilter: _mongoFilter, containsRestrictedProperties: _containsRestrictedProperties } =
						await this.parseFindFilter(value, schema[key], options);
						mongoFilter[key] = _mongoFilter;
					if (_containsRestrictedProperties) containsRestrictedProperties = true;
				} else if (
					operators &&
					typeof value === "object" &&
					value &&
					Object.keys(value).length === 1 &&
					Object.keys(value)[0] &&
					Object.keys(value)[0][0] === "$"
				) {
					// This entire if statement is for handling value operators

					const operator = Object.keys(value)[0];

					// Operator isn't found, so throw an error
					if (allowedValueOperators.indexOf(operator) === -1)
						throw new Error(
							`Invalid filter provided. Operator "${key}" is not allowed.`
						);

					// Handle the $in value operator
					if (operator === "$in") {
						mongoFilter[key] = {
							$in: []
						};

						if (value.$in.length > 0)
							mongoFilter[key].$in = await async.map(
								value.$in,
								async (_value: any) => {
									if (
										typeof schema[key].type === "function"
									) {
										//
										// const Type = schema[key].type;
										// const castValue = new Type(_value);
										// if (schema[key].validate)
										// 	await schema[key]
										// 		.validate(castValue)
										// 		.catch(err => {
										// 			throw new Error(
										// 				`Invalid value for ${key}, ${err}`
										// 			);
										// 		});
										return _value;
									}
									throw new Error(
										`Invalid schema type for ${key}`
									);
								}
							);
					} else
						throw new Error(
							`Unhandled operator "${operator}", this should never happen!`
						);
				} else if (typeof schema[key].type === "function") {
					// Do type checking/casting here

					// const Type = schema[key].type;
					// // const castValue = new Type(value);
					// if (schema[key].validate)
					// 	await schema[key].validate(castValue).catch(err => {
					// 		throw new Error(`Invalid value for ${key}, ${err}`);
					// 	});

					mongoFilter[key] = value;
				} else throw new Error(`Invalid schema type for ${key}`);
			}
		});

		if (containsRestrictedProperties) canCache = false;

		return { mongoFilter, containsRestrictedProperties, canCache };
	}

	// TODO improve caching
	// TODO add support for computed fields
	// TODO parse query - validation
	// TODO add proper typescript support
	// TODO add proper jsdoc
	// TODO add support for enum document attributes
	// TODO add support for array document attributes
	// TODO add support for reference document attributes
	// TODO fix 2nd layer of schema
	/**
	 * find - Get one or more document(s) from a single collection
	 *
	 * @param payload - Payload
	 * @returns Returned object
	 */
	public find<CollectionNameType extends keyof Collections>(
		context: JobContext,
		{
			collection, // Collection name
			filter, // Similar to MongoDB filter
			projection,
			values, // TODO: Add support
			limit = 0, // TODO have limit off by default?
			page = 1,
			useCache = true
		}: {
			collection: CollectionNameType;
			filter: Record<string, any>;
			projection?: Record<string, any> | string[], 
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
						this.parseFindFilter(
							filter,
							this.collections![collection].schema.document
						),

					// If we can use cache, get from the cache, and if we get results return those
					async ({ mongoFilter, canCache }: any) => {
						// console.log(111, mongoFilter, canCache);
						// If we're allowed to cache, and the filter doesn't reference any restricted fields, try to cache the query and its response
						if (cacheable && canCache) {
							// Turn the query object into a sha1 hash that can be used as a Redis key
							queryHash = hash(
								{ collection, mongoFilter, values, limit, page },
								{
									algorithm: "sha1"
								}
							);

							// Check if the query hash already exists in Redis, and get it if it is
							const cachedQuery = await this.redis?.GET(
								`query.find.${queryHash}`
							);

							// Return the mongoFilter along with the cachedDocuments, if any
							return {
								mongoFilter,
								cachedDocuments: cachedQuery
									? JSON.parse(cachedQuery)
									: null
							};
						}

						return { mongoFilter, cachedDocuments: null };
					},

					// If we didn't get documents from the cache, get them from mongo
					async ({ mongoFilter, cachedDocuments }: any) => {
						if (cachedDocuments) {
							cacheable = false;
							return cachedDocuments;
						}

						// const getFindValues = async (object: any) => {
						// 	const find: any = {};
						// 	await async.each(
						// 		Object.entries(object),
						// 		async ([key, value]) => {
						// 			if (
						// 				value.type === undefined &&
						// 				Object.keys(value).length > 0
						// 			) {
						// 				const _find = await getFindValues(
						// 					value
						// 				);
						// 				if (Object.keys(_find).length > 0)
						// 					find[key] = _find;
						// 			} else if (!value.restricted)
						// 				find[key] = true;
						// 		}
						// 	);
						// 	return find;
						// };
						// const find: any = await getFindValues(
						// 	this.collections![collection].schema.document
						// );

						// TODO, add mongo projection. Make sure to keep in mind caching with queryHash.
						const mongoProjection = null;

						return this.collections?.[collection].model
							.find(mongoFilter, mongoProjection)
							.limit(limit)
							.skip((page - 1) * limit);
					},

					// Convert documents from Mongoose model to regular objects
					async (documents: any[]) =>
						async.map(documents, async (document: any) => document._doc ? document._doc : document),

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
					},

					// Strips the document of any unneeded properties or properties that are restricted
					async (documents: any[]) => async.map(documents, async (document: any) => {
						return await this.stripDocument(document, this.collections![collection].schema.document, projection);
					})
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
