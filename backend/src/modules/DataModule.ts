// @ts-nocheck
import async from "async";
import config from "config";
import { Db, MongoClient } from "mongodb";
import hash from "object-hash";
import { createClient, RedisClientType } from "redis";
import JobContext from "src/JobContext";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";
import { UniqueMethods } from "../types/Modules";
import { Collections } from "../types/Collections";

export default class DataModule extends BaseModule {
	private collections?: Collections;

	private mongoClient?: MongoClient;

	private mongoDb?: Db;

	private redisClient?: RedisClientType;

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

						this.mongoClient = new MongoClient(mongoUrl);
						await this.mongoClient.connect();
						this.mongoDb = this.mongoClient.db();
					},

					async () => this.loadCollections(),

					async () => {
						const { url, password } = config.get<{
							url: string;
							password: string;
						}>("redis");

						this.redisClient = createClient({
							url,
							password
						});

						return this.redisClient.connect();
					},

					async () => {
						if (!this.redisClient)
							throw new Error("Redis connection not established");

						return this.redisClient.sendCommand([
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
					if (this.redisClient) await this.redisClient.quit();
					if (this.mongoClient) await this.mongoClient.close(false);
				})
				.finally(() => resolve());
		});
	}

	/**
	 *
	 * @param schema Our own schema format
	 * @returns A Mongoose-compatible schema format
	 */
	private convertSchemaToMongooseSchema(schema: any) {
		// Convert basic types from our own schema types to Mongoose schema types
		const typeToMongooseType = (type: Types) => {
			switch (type) {
				case Types.String:
					return String;
				case Types.Number:
					return Number;
				case Types.Date:
					return Date;
				case Types.Boolean:
					return Boolean;
				case Types.ObjectId:
					return MongooseTypes.ObjectId;
				default:
					return null;
			}
		};

		const schemaEntries = Object.entries(schema);
		const mongooseSchemaEntries = schemaEntries.map(([key, value]) => {
			let mongooseEntry = {};

			// Handle arrays
			if (value.type === Types.Array) {
				// Handle schemas in arrays
				if (value.item.type === Types.Schema)
					mongooseEntry = [
						this.convertSchemaToMongooseSchema(value.item.schema)
					];
				// We don't support nested arrays
				else if (value.item.type === Types.Array)
					throw new Error("Nested arrays are not supported.");
				// Handle regular types in array
				else mongooseEntry.type = [typeToMongooseType(value.item.type)];
			}
			// Handle schemas
			else if (value.type === Types.Schema)
				mongooseEntry = this.convertSchemaToMongooseSchema(
					value.schema
				);
			// Handle regular types
			else mongooseEntry.type = typeToMongooseType(value.type);

			return [key, mongooseEntry];
		});

		const mongooseSchema = Object.fromEntries(mongooseSchemaEntries);

		return mongooseSchema;
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
					resolve({
						schema,
						collection: this.mongoDb?.collection(
							collectionName.toString()
						)
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
	 * Returns the projection array/object that is one level deeper based on the property key
	 *
	 * @param projection The projection object/array
	 * @param key The property key
	 * @returns Array or Object
	 */
	private getDeeperProjection(projection: any, key: string) {
		let deeperProjection;
		if (Array.isArray(projection))
			deeperProjection = projection
				.filter(property => property.startsWith(`${key}.`))
				.map(property => property.substr(`${key}.`.length));
		else if (typeof projection === "object")
			deeperProjection =
				projection[key] ??
				Object.keys(projection).reduce(
					(wipProjection, property) =>
						property.startsWith(`${key}.`)
							? {
									...wipProjection,
									[property.substr(`${key}.`.length)]:
										projection[property]
							  }
							: wipProjection,
					{}
				);
		return deeperProjection;
	}

	/**
	 * Whether a property is allowed in a projection array/object
	 *
	 * @param projection
	 * @param property
	 * @returns
	 */
	private allowedByProjection(projection: any, property: string) {
		if (Array.isArray(projection))
			return projection.indexOf(property) !== -1;
		if (typeof projection === "object") return !!projection[property];
		return false;
	}

	/**
	 * Strip a document object from any unneeded properties, or of any restricted properties
	 * If a projection is given
	 *
	 * @param document The document object
	 * @param schema The schema object
	 * @param projection The projection, which can be null
	 * @returns
	 */
	private async stripDocument(document: any, schema: any, projection: any) {
		// TODO add better comments
		// TODO add support for nested objects in arrays
		// TODO handle projection excluding properties, rather than assume it's only including properties

		const unfilteredEntries = Object.entries(document);
		const filteredEntries = await async.reduce(
			unfilteredEntries,
			[],
			async (memo, [key, value]) => {
				// If the property does not exist in the schema, return the memo
				if (!schema[key]) return memo;

				// Handle nested object
				if (schema[key].type === undefined) {
					// If value is null, it can't be an object, so just return its value
					if (!value) return [...memo, [key, value]];

					// Get the projection for the next layer
					const deeperProjection = this.getDeeperProjection(
						projection,
						key
					);

					// Generate a stripped document/object for the current key/value
					const strippedDocument = await this.stripDocument(
						value,
						schema[key],
						deeperProjection
					);

					// If the returned stripped document/object has keys, add the current key with that document/object to the memeo
					if (Object.keys(strippedDocument).length > 0)
						return [...memo, [key, strippedDocument]];

					// The current key has no values that should be returned, so just return the memo
					return memo;
				}

				// If we have a projection, check if the current key is allowed by it. If it is, add the key/value to the memo, otherwise just return the memo
				if (projection)
					return this.allowedByProjection(projection, key)
						? [...memo, [key, value]]
						: memo;

				// If the property is restricted, return memo
				if (schema[key].restricted) return memo;

				// The property exists in the schema, is not explicitly allowed, is not restricted, so add it to memo
				return [...memo, [key, value]];
			}
		);

		return Object.fromEntries(filteredEntries);
	}

	/**
	 * Parse a projection based on the schema and any given projection
	 * If no projection is given, it will exclude any restricted properties
	 * If a projection is given, it will exclude restricted properties that are not explicitly allowed in a projection
	 * It will return a projection used in Mongo, and if any restricted property is explicitly allowed, return that we can't use the cache
	 *
	 * @param schema The schema object
	 * @param projection The project, which can be null
	 * @returns
	 */
	private async parseFindProjection(projection: any, schema: any) {
		// The mongo projection object we're going to build
		const mongoProjection = {};
		// This will be false if we let Mongo return any restricted properties
		let canCache = true;

		// TODO add better comments
		// TODO add support for nested objects in arrays

		const unfilteredEntries = Object.entries(schema);
		await async.forEach(unfilteredEntries, async ([key, value]) => {
			// If we have a projection set:
			if (projection) {
				const allowed = this.allowedByProjection(projection, key);
				const { restricted } = value;

				// If the property is explicitly allowed in the projection, but also restricted, find can't use cache
				if (allowed && restricted) {
					canCache = false;
				}
				// If the property is restricted, but not explicitly allowed, make sure to have mongo exclude it. As it's excluded from Mongo, caching isn't an issue for this property
				else if (restricted) {
					mongoProjection[key] = false;
				}
				// If the current property is a nested object
				else if (value.type === undefined) {
					// Get the projection for the next layer
					const deeperProjection = this.getDeeperProjection(
						projection,
						key
					);

					// Parse projection for the current value, so one level deeper
					const parsedProjection = await this.parseFindProjection(
						deeperProjection,
						value
					);

					// If the parsed projection mongo projection contains anything, update our own mongo projection
					if (
						Object.keys(parsedProjection.mongoProjection).length > 0
					)
						mongoProjection[key] = parsedProjection.mongoProjection;

					// If the parsed projection says we can't use the cache, make sure we can't use cache either
					canCache = canCache && parsedProjection.canCache;
				}
			}
			// If we have no projection set, and the current property is restricted, exclude the property from mongo, but don't say we can't use the cache
			else if (value.restricted) mongoProjection[key] = false;
			// If we have no projection set, and the current property is not restricted, and the current property is a nested object
			else if (value.type === undefined) {
				// Pass the nested schema object recursively into the parseFindProjection function
				const parsedProjection = await this.parseFindProjection(
					null,
					value
				);

				// If the returned mongo projection includes anything special, include it in the mongo projection we're returning
				if (Object.keys(parsedProjection.mongoProjection).length > 0)
					mongoProjection[key] = parsedProjection.mongoProjection;

				// Since we're not passing a projection into parseFindProjection, there's no chance that we can't cache
			}
		});

		return {
			canCache,
			mongoProjection
		};
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
	): Promise<{
		mongoFilter: any;
		containsRestrictedProperties: boolean;
		canCache: boolean;
	}> {
		if (!filter || typeof filter !== "object")
			throw new Error(
				"Invalid filter provided. Filter must be an object."
			);

		const keys = Object.keys(filter);
		if (keys.length === 0)
			throw new Error(
				"Invalid filter provided. Filter must contain keys."
			);

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
							containsRestrictedProperties:
								_containsRestrictedProperties
						} = await this.parseFindFilter(_value, schema, options);

						// Actually add the returned filter object to the mongo query we're building
						mongoFilter[key].push(_mongoFilter);
						if (_containsRestrictedProperties)
							containsRestrictedProperties = true;
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
					const {
						mongoFilter: _mongoFilter,
						containsRestrictedProperties:
							_containsRestrictedProperties
					} = await this.parseFindFilter(value, schema[key], options);
					mongoFilter[key] = _mongoFilter;
					if (_containsRestrictedProperties)
						containsRestrictedProperties = true;
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
			limit = 0, // TODO have limit off by default?
			page = 1,
			useCache = true
		}: {
			collection: CollectionNameType;
			filter: Record<string, any>;
			projection?: Record<string, any> | string[];
			values?: Record<string, any>;
			limit?: number;
			page?: number;
			useCache?: boolean;
		}
	): Promise<any | null> {
		return new Promise((resolve, reject) => {
			let queryHash: string | null = null;
			let cacheable = useCache !== false;

			let mongoFilter;
			let mongoProjection;

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
						const parsedFilter = await this.parseFindFilter(
							filter,
							this.collections![collection].schema.document
						);

						cacheable = cacheable && parsedFilter.canCache;
						mongoFilter = parsedFilter.mongoFilter;
					},

					// Verify whether the query is valid-enough to continue
					async () => {
						const parsedProjection = await this.parseFindProjection(
							projection,
							this.collections![collection].schema.document
						);

						cacheable = cacheable && parsedProjection.canCache;
						mongoProjection = parsedProjection.mongoProjection;
					},

					// If we can use cache, get from the cache, and if we get results return those
					async () => {
						// If we're allowed to cache, and the filter doesn't reference any restricted fields, try to cache the query and its response
						if (cacheable) {
							// Turn the query object into a sha1 hash that can be used as a Redis key
							queryHash = hash(
								{
									collection,
									mongoFilter,
									limit,
									page
								},
								{
									algorithm: "sha1"
								}
							);

							// Check if the query hash already exists in Redis, and get it if it is
							const cachedQuery = await this.redisClient?.GET(
								`query.find.${queryHash}`
							);

							// Return the mongoFilter along with the cachedDocuments, if any
							return {
								cachedDocuments: cachedQuery
									? JSON.parse(cachedQuery)
									: null
							};
						}

						return { cachedDocuments: null };
					},

					// If we didn't get documents from the cache, get them from mongo
					async ({ cachedDocuments }: any) => {
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

						return this.collections?.[collection].collection
							.find(mongoFilter, mongoProjection)
							.limit(limit)
							.skip((page - 1) * limit);
					},

					// Convert documents from MongoDB model to regular objects
					async (documents: any[]) =>
						async.map(documents, async (document: any) =>
							document._doc ? document._doc : document
						),

					// Add documents to the cache
					async (documents: any[]) => {
						// Adds query results to cache but doesnt await
						if (cacheable && queryHash) {
							this.redisClient!.SET(
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
					async (documents: any[]) =>
						async.map(documents, async (document: any) =>
							this.stripDocument(
								document,
								this.collections![collection].schema.document,
								projection
							)
						)
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
