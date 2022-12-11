import config from "config";
import { Db, MongoClient, ObjectId } from "mongodb";
import { createHash } from "node:crypto";
import { createClient, RedisClientType } from "redis";
import JobContext from "../JobContext";
import BaseModule from "../BaseModule";
import Schema, { Types } from "../Schema";
import { Collections } from "../types/Collections";
import { Document as SchemaDocument } from "../types/Document";
import { UniqueMethods } from "../types/Modules";
import { AttributeValue } from "../types/AttributeValue";

type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

interface ProjectionObject {
	[property: string]: boolean | string[] | ProjectionObject;
}

type Projection = null | undefined | string[] | ProjectionObject;

type NormalizedProjection = {
	projection: [string, boolean][];
	mode: "includeAllBut" | "excludeAllBut";
};

interface MongoFilter {
	[property: string]:
		| AttributeValue
		| AttributeValue[]
		| MongoFilter
		| MongoFilter[];
}

interface Document {
	[property: string]:
		| AttributeValue
		| AttributeValue[]
		| Document
		| Document[];
}

type AllowedRestricted = boolean | string[] | null | undefined;

export default class DataModule extends BaseModule {
	private collections?: Collections;

	private mongoClient?: MongoClient;

	private mongoDb?: Db;

	private redisClient?: RedisClientType;

	/**
	 * Data Module
	 */
	public constructor() {
		super("data");
	}

	/**
	 * startup - Startup data module
	 */
	public override async startup() {
		await super.startup();

		const mongoUrl = config.get<string>("mongo.url");

		this.mongoClient = new MongoClient(mongoUrl);
		await this.mongoClient.connect();
		this.mongoDb = this.mongoClient.db();

		await this.loadCollections();

		const { url } = config.get<{ url: string }>("redis");

		this.redisClient = createClient({ url });

		await this.redisClient.connect();

		const redisConfigResponse = await this.redisClient.sendCommand([
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

		await super.started();
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override async shutdown() {
		await super.shutdown();
		if (this.redisClient) await this.redisClient.quit();
		if (this.mongoClient) await this.mongoClient.close(false);
	}

	/**
	 * loadColllection - Import and load collection schema
	 *
	 * @param collectionName - Name of the collection
	 * @returns Collection
	 */
	private async loadCollection<T extends keyof Collections>(
		collectionName: T
	) {
		const { default: schema }: { default: Schema } = await import(
			`../collections/${collectionName.toString()}`
		);
		return {
			schema,
			collection: this.mongoDb!.collection(collectionName.toString())
		};
	}

	/**
	 * loadCollections - Load and initialize all collections
	 *
	 * @returns Promise
	 */
	private async loadCollections() {
		this.collections = {
			abc: await this.loadCollection("abc"),
			station: await this.loadCollection("station")
		};
	}

	/**
	 * Takes a raw projection and turns it into a projection we can easily use
	 *
	 * @param projection - The raw projection
	 * @returns Normalized projection
	 */
	private normalizeProjection(projection: Projection): NormalizedProjection {
		let initialProjection = projection;
		if (
			!(projection && typeof initialProjection === "object") &&
			!Array.isArray(initialProjection)
		)
			initialProjection = [];

		// Flatten the projection into a 2-dimensional array of key-value pairs
		let flattenedProjection = this.flattenProjection(initialProjection);

		// Make sure all values are booleans
		flattenedProjection = flattenedProjection.map(([key, value]) => {
			if (typeof value !== "boolean") return [key, !!value];
			return [key, value];
		});

		// Validate whether we have any 1:1 duplicate keys, and if we do, throw a path collision error
		const projectionKeys = flattenedProjection.map(([key]) => key);
		const uniqueProjectionKeys = new Set(projectionKeys);
		if (uniqueProjectionKeys.size !== flattenedProjection.length)
			throw new Error("Path collision, non-unique key");

		// Check for path collisions that are not the same, but for example for nested keys, like prop1.prop2 and prop1.prop2.prop3
		projectionKeys.forEach(key => {
			// Non-nested paths don't need to be checked, they're covered by the earlier path collision checking
			if (key.indexOf(".") !== -1) {
				// Recursively check for each layer of a key whether that key exists already, and if it does, throw a path collision error
				const recursivelyCheckForPathCollision = (
					keyToCheck: string
				) => {
					// Remove the last ".prop" from the key we want to check, to check if that has any collisions
					const subKey = keyToCheck.substring(
						0,
						keyToCheck.lastIndexOf(".")
					);

					if (projectionKeys.indexOf(subKey) !== -1)
						throw new Error(
							`Path collision! ${key} collides with ${subKey}`
						);

					// The sub key has another layer or more, so check that layer for path collisions too
					if (subKey.indexOf(".") !== -1)
						recursivelyCheckForPathCollision(subKey);
				};

				recursivelyCheckForPathCollision(key);
			}
		});

		// Check if we explicitly allow anything (with the exception of _id)
		const anyNonIdTrues = flattenedProjection.reduce(
			(anyTrues, [key, value]) => anyTrues || (value && key !== "_id"),
			false
		);

		// By default, include everything except keys whose value is false
		let mode: "includeAllBut" | "excludeAllBut" = "includeAllBut";

		// If in the projection we have any keys whose value is true (with the exception of _id), switch to excluding all but keys we explicitly set to true in the projection
		if (anyNonIdTrues) mode = "excludeAllBut";

		return { projection: flattenedProjection, mode };
	}

	/**
	 * Flatten the projection we've given (which can be an array of an object) into an array with key/value pairs
	 *
	 * @param projection - Projection
	 * @returns
	 */
	private flattenProjection(projection: Projection): [string, boolean][] {
		let flattenedProjection: [
			string,
			boolean | string[] | ProjectionObject
		][] = [];

		if (!projection) throw new Error("Projection can't be null");

		// Turn object/array into a key/value array
		if (Array.isArray(projection))
			flattenedProjection = projection.map(key => [key, true]);
		else if (typeof projection === "object")
			flattenedProjection = Object.entries(projection);

		// Go through our projection array, and recursively check if there is another layer we need to flatten
		const newProjection: [string, boolean][] = flattenedProjection.reduce(
			(currentEntries: [string, boolean][], [key, value]) => {
				if (typeof value === "object") {
					let flattenedValue = this.flattenProjection(value);
					flattenedValue = flattenedValue.map(
						([nextKey, nextValue]) => [
							`${key}.${nextKey}`,
							nextValue
						]
					);
					return [...currentEntries, ...flattenedValue];
				}
				return [...currentEntries, [key, value]];
			},
			[]
		);

		return newProjection;
	}

	/**
	 * Parse a projection based on the schema and any given projection
	 * If no projection is given, it will exclude any restricted properties
	 * If a projection is given, it will exclude restricted properties that are not explicitly allowed in a projection
	 * It will return a projection used in Mongo, and if any restricted property is explicitly allowed, return that we can't use the cache
	 *
	 * @param schema - The schema object
	 * @param projection - The project, which can be null
	 * @returns
	 */
	private async parseFindProjection(
		projection: NormalizedProjection,
		schema: SchemaDocument,
		allowedRestricted: AllowedRestricted
	) {
		// The mongo projection object we're going to build
		const mongoProjection: ProjectionObject = {};
		// This will be false if we let Mongo return any restricted properties
		let canCache = true;

		const unfilteredEntries = Object.entries(schema);
		await Promise.all(
			unfilteredEntries.map(async ([key, value]) => {
				const { restricted } = value;

				// Check if the current property is allowed or not based on allowedRestricted
				const allowedByRestricted =
					!restricted ||
					this.allowedByRestricted(allowedRestricted, key);

				// If the property is explicitly allowed in the projection, but also restricted, find can't use cache
				if (allowedByRestricted && restricted) {
					canCache = false;
				}
				// If the property is restricted, but not explicitly allowed, make sure to have mongo exclude it. As it's excluded from Mongo, caching isn't an issue for this property
				else if (!allowedByRestricted) {
					mongoProjection[key] = false;
				}
				// If the current property is a nested schema
				else if (value.type === Types.Schema) {
					// Get the projection for the next layer
					const deeperProjection = this.getDeeperProjection(
						projection,
						key
					);

					// Get the allowedRestricted for the next layer
					const deeperAllowedRestricted =
						this.getDeeperAllowedRestricted(allowedRestricted, key);

					if (!value.schema) throw new Error("Schema is not defined");
					// Parse projection for the current value, so one level deeper
					const parsedProjection = await this.parseFindProjection(
						deeperProjection,
						value.schema,
						deeperAllowedRestricted
					);

					// If the parsed projection mongo projection contains anything, update our own mongo projection
					if (
						Object.keys(parsedProjection.mongoProjection).length > 0
					)
						mongoProjection[key] = parsedProjection.mongoProjection;

					// If the parsed projection says we can't use the cache, make sure we can't use cache either
					canCache = canCache && parsedProjection.canCache;
				}
			})
		);

		return {
			canCache,
			mongoProjection
		};
	}

	/**
	 * Whether a property is allowed if it's restricted
	 *
	 * @param projection - The projection object/array
	 * @param property - Property name
	 * @returns
	 */
	private allowedByRestricted(
		allowedRestricted: AllowedRestricted,
		property: string
	) {
		// All restricted properties are allowed, so allow
		if (allowedRestricted === true) return true;
		// No restricted properties are allowed, so don't allow
		if (!allowedRestricted) return false;
		// allowedRestricted is not valid, so don't allow
		if (!Array.isArray(allowedRestricted)) return false;

		// This exact property is allowed, so allow
		if (allowedRestricted.indexOf(property) !== -1) return true;

		// Don't allow by default
		return false;
	}

	/**
	 * Whether a property is allowed in a projection array/object
	 *
	 * @param projection - The projection object/array
	 * @param property - Property name
	 * @returns
	 */
	private allowedByProjection(
		projection: NormalizedProjection,
		property: string
	) {
		const obj = Object.fromEntries(projection.projection);

		if (projection.mode === "excludeAllBut") {
			// Only allow if explicitly allowed
			if (obj[property]) return true;

			// If this is a nested property that has any allowed properties at some lower level, allow at this level
			const nestedTrue = projection.projection.reduce(
				(nestedTrue, [key, value]) => {
					if (value && key.startsWith(`${property}.`)) return true;
					return nestedTrue;
				},
				false
			);

			return nestedTrue;
		}

		if (projection.mode === "includeAllBut") {
			// Explicitly excluded, so don't allow
			if (obj[property] === false) return false;

			// Not explicitly excluded, so allow this level
			return true;
		}

		// This should never happen
		return false;
	}

	/**
	 * Returns the projection array/object that is one level deeper based on the property key
	 *
	 * @param projection - The projection object/array
	 * @param key - The property key
	 * @returns Array or Object
	 */
	private getDeeperProjection(
		projection: NormalizedProjection,
		currentKey: string
	): NormalizedProjection {
		const newProjection: [string, boolean][] = projection.projection
			// Go through all key/values
			.map(([key, value]) => {
				// If a key has no ".", it has no deeper level, so return false
				// If a key doesn't start with the provided currentKey, it's useless to us, so return false
				if (
					key.indexOf(".") === -1 ||
					!key.startsWith(`${currentKey}.`)
				)
					return false;
				// Get the lower key, so everything after "."
				const lowerKey = key.substring(
					key.indexOf(".") + 1,
					key.length
				);
				// If the lower key is empty for some reason, return false, but this should never happen
				if (lowerKey.length === 0) return false;
				return [lowerKey, value];
			})
			// Filter out any false's, so only key/value pairs remain
			// .filter<[string, boolean]>(entries => !!entries);
			.filter((entries): entries is [string, boolean] => !!entries);

		// Return the new projection with the projection array, and the same existing mode for the projection
		return { projection: newProjection, mode: projection.mode };
	}

	/**
	 * Returns the allowedRestricted that is one level deeper based on the property key
	 *
	 * @param projection - The projection object/array
	 * @param key - The property key
	 * @returns Array or Object
	 */
	private getDeeperAllowedRestricted(
		allowedRestricted: AllowedRestricted,
		currentKey: string
	): AllowedRestricted {
		//
		if (typeof allowedRestricted === "boolean") return allowedRestricted;
		if (!Array.isArray(allowedRestricted)) return false;

		const newAllowedRestricted: string[] = <string[]>allowedRestricted
			// Go through all key/values
			.map(key => {
				// If a key has no ".", it has no deeper level, so return false
				// If a key doesn't start with the provided currentKey, it's useless to us, so return false
				if (
					key.indexOf(".") === -1 ||
					!key.startsWith(`${currentKey}.`)
				)
					return false;
				// Get the lower key, so everything after "."
				const lowerKey = key.substring(
					key.indexOf(".") + 1,
					key.length
				);
				// If the lower key is empty for some reason, return false, but this should never happen
				if (lowerKey.length === 0) return false;
				return lowerKey;
			})
			// Filter out any false's, so only keys remain
			.filter(entries => entries);

		// Return the new allowedRestricted
		return newAllowedRestricted;
	}

	private getCastedValue(value: unknown, schemaType: Types): AttributeValue {
		if (value === null || value === undefined) return null;

		if (schemaType === Types.String) {
			// Check if value is a string, and if not, convert the value to a string
			const castedValue =
				typeof value === "string" ? value : String(value);
			// Any additional validation comes here
			return castedValue;
		}
		if (schemaType === Types.Number) {
			// Check if value is a number, and if not, convert the value to a number
			const castedValue =
				typeof value === "number" ? value : Number(value);
			// We don't allow NaN for numbers, so throw an error
			if (Number.isNaN(castedValue))
				throw new Error(
					`Cast error, number cannot be NaN, with value ${value}`
				);
			// Any additional validation comes here
			return castedValue;
		}
		if (schemaType === Types.Date) {
			// Check if value is a Date, and if not, convert the value to a Date
			const castedValue =
				Object.prototype.toString.call(value) === "[object Date]"
					? (value as Date)
					: new Date(value.toString());
			// We don't allow invalid dates, so throw an error
			if (new Date(castedValue).toString() === "Invalid Date")
				throw new Error(
					`Cast error, date cannot be invalid, with value ${value}`
				);
			// Any additional validation comes here
			return castedValue;
		}
		if (schemaType === Types.Boolean) {
			// Check if value is a boolean, and if not, convert the value to a boolean
			const castedValue =
				typeof value === "boolean" ? value : Boolean(value);
			// Any additional validation comes here
			return castedValue;
		}
		if (schemaType === Types.ObjectId) {
			if (typeof value !== "string" && !(value instanceof ObjectId))
				throw new Error(
					`Cast error, ObjectId invalid, with value ${value}`
				);
			// Cast the value as an ObjectId and let Mongoose handle the rest
			const castedValue = new ObjectId(value);
			// Any additional validation comes here
			return castedValue;
		}
		throw new Error(
			`Unsupported schema type found with type ${Types[schemaType]}. This should never happen.`
		);
	}

	/**
	 * parseFindFilter - Ensure validity of filter and return a mongo filter
	 *
	 * @param filter - Filter
	 * @param schema - Schema of collection document
	 * @param options - Parser options
	 * @returns Promise returning object with query values cast to schema types
	 * 			and whether query includes restricted attributes
	 */
	private async parseFindFilter(
		filter: MongoFilter,
		schema: SchemaDocument,
		allowedRestricted: AllowedRestricted,
		options?: {
			operators?: boolean;
		}
	): Promise<{
		mongoFilter: MongoFilter;
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
		const mongoFilter: MongoFilter = {};
		// If the filter references any properties that are restricted, this will be true, so that find knows not to cache the query object
		let containsRestrictedProperties = false;
		// Whether this filter is cachable or not
		let canCache = true;

		// Operators at the key level that we support right now
		const allowedKeyOperators = ["$or", "$and"];
		// Operators at the value level that we support right now
		const allowedValueOperators = ["$in"];

		// Loop through all key/value properties
		await Promise.all(
			Object.entries(filter).map(async ([key, value]) => {
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
								`Key "${key}" must contain array of filters.`
							);

						// Add the operator to the mongo filter object as an empty array
						mongoFilter[key] = [];

						// Run parseFindQuery again for child objects and add them to the mongo filter operator array
						await Promise.all(
							value.map(async _value => {
								// Value must be an actual object, so if it's not, throw an error
								if (
									!_value ||
									typeof _value !== "object" ||
									_value.constructor.name !== "Object"
								)
									throw Error("not an object");

								const {
									mongoFilter: _mongoFilter,
									containsRestrictedProperties:
										_containsRestrictedProperties
								} = await this.parseFindFilter(
									_value as MongoFilter,
									schema,
									allowedRestricted,
									options
								);

								// Actually add the returned filter object to the mongo filter we're building
								(<MongoFilter[]>mongoFilter[key]).push(
									_mongoFilter
								);
								if (_containsRestrictedProperties)
									containsRestrictedProperties = true;
							})
						);
					} else
						throw new Error(
							`Unhandled operator "${key}", this should never happen!`
						);
				} else {
					// Here we handle any normal keys in the query object

					let currentKey = key;

					// If the key doesn't exist in the schema, throw an error
					if (!Object.hasOwn(schema, key)) {
						if (key.indexOf(".") !== -1) {
							currentKey = key.substring(0, key.indexOf("."));

							if (!Object.hasOwn(schema, currentKey))
								throw new Error(
									`Key "${currentKey}" does not exist in the schema.`
								);

							if (
								schema[currentKey].type !== Types.Schema &&
								(schema[currentKey].type !== Types.Array ||
									(schema[currentKey].item!.type !==
										Types.Schema &&
										schema[currentKey].item!.type !==
											Types.Array))
							)
								throw new Error(
									`Key "${currentKey}" is not a schema/array.`
								);
						} else
							throw new Error(
								`Key "${key}" does not exist in the schema.`
							);
					}

					const { restricted } = schema[currentKey];

					// Check if the current property is allowed or not based on allowedRestricted
					const allowedByRestricted =
						!restricted ||
						this.allowedByRestricted(allowedRestricted, currentKey);

					if (!allowedByRestricted)
						throw new Error(`Key "${currentKey}" is restricted.`);

					// If the key in the schema is marked as restricted, containsRestrictedProperties will be true
					if (restricted) containsRestrictedProperties = true;

					// Handle value operators
					if (
						operators &&
						typeof value === "object" &&
						value &&
						Object.keys(value).length === 1 &&
						Object.keys(value)[0] &&
						Object.keys(value)[0][0] === "$"
					) {
						// This entire if statement is for handling value operators like $in
						const operator = Object.keys(value)[0];

						// Operator isn't found, so throw an error
						if (allowedValueOperators.indexOf(operator) === -1)
							throw new Error(
								`Invalid filter provided. Operator "${operator}" is not allowed.`
							);

						// Handle the $in value operator
						if (operator === "$in") {
							// Decide what type should be for the values for $in
							let { type } = schema[currentKey];
							// We don't allow schema type for $in
							if (type === Types.Schema)
								throw new Error(
									`Key "${currentKey}" is of type schema, which is not allowed with $in`
								);
							// Set the type to be the array item type if it's about an array
							if (type === Types.Array)
								type = schema[key].item!.type;

							const value$in = (<{ $in: AttributeValue[] }>value)
								.$in;
							let filter$in: AttributeValue[] = [];

							if (!Array.isArray(value$in))
								throw new Error("$in musr be array");

							// Loop through all $in array items, check if they're not null/undefined, cast them, and return a new array
							if (value$in.length > 0)
								filter$in = await Promise.all(
									value$in.map(async _value => {
										const isNullOrUndefined =
											_value === null ||
											_value === undefined;
										if (isNullOrUndefined)
											throw new Error(
												`Value for key ${currentKey} using $in is undefuned/null, which is not allowed.`
											);

										const castedValue = this.getCastedValue(
											_value,
											type
										);

										return castedValue;
									})
								);

							mongoFilter[currentKey] = { $in: filter$in };
						} else
							throw new Error(
								`Unhandled operator "${operator}", this should never happen!`
							);
					}
					// Handle schema type
					else if (schema[currentKey].type === Types.Schema) {
						let subFilter;
						if (key.indexOf(".") !== -1) {
							const subKey = key.substring(
								key.indexOf(".") + 1,
								key.length
							);
							subFilter = {
								[subKey]: value
							};
						} else subFilter = value;

						// Sub-filter must be an actual object, so if it's not, throw an error
						if (
							!subFilter ||
							typeof subFilter !== "object" ||
							subFilter.constructor.name !== "Object"
						)
							throw Error("not an object");

						// Get the allowedRestricted for the next layer
						const deeperAllowedRestricted =
							this.getDeeperAllowedRestricted(
								allowedRestricted,
								currentKey
							);

						// Run parseFindFilter on the nested schema object
						const {
							mongoFilter: _mongoFilter,
							containsRestrictedProperties:
								_containsRestrictedProperties
						} = await this.parseFindFilter(
							subFilter as MongoFilter,
							schema[currentKey].schema!,
							deeperAllowedRestricted,
							options
						);
						mongoFilter[currentKey] = _mongoFilter;
						if (_containsRestrictedProperties)
							containsRestrictedProperties = true;
					}
					// Handle array type
					else if (schema[currentKey].type === Types.Array) {
						const isNullOrUndefined =
							value === null || value === undefined;
						if (isNullOrUndefined)
							throw new Error(
								`Value for key ${currentKey} is an array item, so it cannot be null/undefined.`
							);

						// The type of the array items
						const itemType = schema[currentKey].item!.type;

						// Handle nested arrays, which are not supported
						if (itemType === Types.Array)
							throw new Error("Nested arrays not supported");
						// Handle schema array item type
						else if (itemType === Types.Schema) {
							let subFilter;
							if (key.indexOf(".") !== -1) {
								const subKey = key.substring(
									key.indexOf(".") + 1,
									key.length
								);
								subFilter = {
									[subKey]: value
								};
							} else subFilter = value;

							// Sub-filter must be an actual object, so if it's not, throw an error
							if (
								typeof subFilter !== "object" ||
								subFilter.constructor.name !== "Object"
							)
								throw Error("not an object");

							// Get the allowedRestricted for the next layer
							const deeperAllowedRestricted =
								this.getDeeperAllowedRestricted(
									allowedRestricted,
									currentKey
								);

							const {
								mongoFilter: _mongoFilter,
								containsRestrictedProperties:
									_containsRestrictedProperties
							} = await this.parseFindFilter(
								subFilter as MongoFilter,
								schema[currentKey].item!.schema!,
								deeperAllowedRestricted,
								options
							);
							mongoFilter[currentKey] = _mongoFilter;
							if (_containsRestrictedProperties)
								containsRestrictedProperties = true;
						}
						// Normal array item type
						else {
							// Value must not be an array, so if it is, throw an error
							if (Array.isArray(value)) throw Error("an array");

							// Value must not be an actual object, so if it is, throw an error
							if (
								typeof value === "object" &&
								value.constructor.name === "Object"
							)
								throw Error("an object");

							mongoFilter[currentKey] = this.getCastedValue(
								value as AttributeValue,
								itemType
							);
						}
					}
					// Handle normal types
					else {
						const isNullOrUndefined =
							value === null || value === undefined;
						if (isNullOrUndefined && schema[key].required)
							throw new Error(
								`Value for key ${key} is required, so it cannot be null/undefined.`
							);

						// If the value is null or undefined, just set it as null
						if (isNullOrUndefined) mongoFilter[key] = null;
						// Cast and validate values
						else {
							const schemaType = schema[key].type;

							// Value must not be an array, so if it is, throw an error
							if (Array.isArray(value)) throw Error("an array");

							// Value must not be an actual object, so if it is, throw an error
							if (
								typeof value === "object" &&
								value.constructor.name === "Object"
							)
								throw Error("an object");

							mongoFilter[key] = this.getCastedValue(
								value as AttributeValue,
								schemaType
							);
						}
					}
				}
			})
		);

		if (containsRestrictedProperties) canCache = false;

		return { mongoFilter, containsRestrictedProperties, canCache };
	}

	/**
	 * Strip a document object from any unneeded properties, or of any restricted properties
	 * If a projection is given
	 * Also casts some values
	 *
	 * @param document - The document object
	 * @param schema - The schema object
	 * @param projection - The projection, which can be null
	 */
	private async stripDocument(
		document: Document,
		schema: SchemaDocument,
		projection: NormalizedProjection,
		allowedRestricted: AllowedRestricted
	): Promise<Document> {
		const unfilteredEntries = Object.entries(document);
		// Go through all properties in the document to decide whether to allow it or not, and possibly casts the value to its property type
		const filteredEntries: Entries<Document> = [];
		await Promise.all(
			unfilteredEntries.map(async ([key, value]) => {
				// If the property does not exist in the schema, return the memo, so we won't return the key/value in the stripped document
				if (!schema[key]) return;

				// If we have a projection, check if the current key is allowed by it. If it not, just return the memo
				const allowedByProjection = this.allowedByProjection(
					projection,
					key
				);

				const allowedByRestricted =
					!schema[key].restricted ||
					this.allowedByRestricted(allowedRestricted, key);

				if (!allowedByProjection) return;
				if (!allowedByRestricted) return;

				// Handle nested object
				if (schema[key].type === Types.Schema) {
					// If value is falsy, it can't be an object, so just return null
					if (!value) {
						filteredEntries.push([key, null]);
						return;
					}

					// Value must be an actual object, so if it's not, throw an error
					if (
						typeof value !== "object" ||
						value.constructor.name !== "Object"
					)
						throw Error("not an object");

					// Get the projection for the next layer
					const deeperProjection = this.getDeeperProjection(
						projection,
						key
					);
					// Get the allowedRestricted for the next layer
					const deeperAllowedRestricted =
						this.getDeeperAllowedRestricted(allowedRestricted, key);

					// Generate a stripped document/object for the current key/value
					const strippedDocument = await this.stripDocument(
						value as Document, // We can be sure the value is a document, so this is for TypeScript to be happy
						schema[key].schema!,
						deeperProjection,
						deeperAllowedRestricted
					);

					// If the returned stripped document/object has keys, add the current key with that document/object to the memo
					if (Object.keys(strippedDocument).length > 0) {
						filteredEntries.push([key, strippedDocument]);
						return;
					}

					// The current key has no values that should be returned, so just return empty object
					filteredEntries.push([key, {}]);
					return;
				}

				// Handle array type
				if (schema[key].type === Types.Array) {
					// If value is falsy, return null with the key instead
					if (!value) {
						filteredEntries.push([key, null]);
						return;
					}

					// If value isn't a valid array, throw error
					if (!Array.isArray(value)) throw Error("not an array");

					// The type of the array items
					const itemType = schema[key].item!.type;

					const items = (await Promise.all(
						value.map(async item => {
							// Handle schema objects inside an array
							if (itemType === Types.Schema) {
								// Item must be an actual object, so if it's not, throw an error
								if (
									!item ||
									typeof item !== "object" ||
									item.constructor.name !== "Object"
								)
									throw Error("not an object");

								// Get the projection for the next layer
								const deeperProjection =
									this.getDeeperProjection(projection, key);
								// Get the allowedRestricted for the next layer
								const deeperAllowedRestricted =
									this.getDeeperAllowedRestricted(
										allowedRestricted,
										key
									);

								// Generate a stripped document/object for the current key/value
								const strippedDocument =
									await this.stripDocument(
										item as Document, // We can be sure the item is a document, so this is for TypeScript to be happy
										schema[key].item!.schema!,
										deeperProjection,
										deeperAllowedRestricted
									);

								// If the returned stripped document/object has keys, return the stripped document
								if (Object.keys(strippedDocument).length > 0)
									return strippedDocument;

								// The current item has no values that should be returned, so just return empty object
								return {};
							}
							// Nested arrays are not supported
							if (itemType === Types.Array) {
								throw new Error("Nested arrays not supported");
							}
							// Handle normal types
							else {
								// If item is null or undefined, return null
								const isNullOrUndefined =
									item === null || item === undefined;
								if (isNullOrUndefined) return null;

								// Cast item
								const castedValue = this.getCastedValue(
									item,
									itemType
								);

								return castedValue;
							}
						})
					)) as AttributeValue[] | Document[];

					filteredEntries.push([key, items]);
					return;
				}

				// Handle normal types

				// Cast item
				const castedValue = this.getCastedValue(
					value,
					schema[key].type
				);

				filteredEntries.push([key, castedValue]);
			})
		);

		return Object.fromEntries(filteredEntries);
	}

	/**
	 * find - Get one or more document(s) from a single collection
	 *
	 * @param payload - Payload
	 * @returns Returned object
	 */
	public async find<CollectionNameType extends keyof Collections>(
		context: JobContext,
		{
			collection, // Collection name
			filter, // Similar to MongoDB filter
			projection,
			allowedRestricted,
			limit = 1,
			page = 1,
			useCache = true
		}: {
			collection: CollectionNameType;
			filter: MongoFilter;
			projection?: Projection;
			allowedRestricted?: boolean | string[];
			limit?: number;
			page?: number;
			useCache?: boolean;
		}
	) {
		// Verify page and limit parameters
		if (page < 1) throw new Error("Page must be at least 1");
		if (limit < 1) throw new Error("Limit must be at least 1");
		if (limit > 100) throw new Error("Limit must not be greater than 100");

		// Verify whether the collection exists, and get the schema
		if (!collection) throw new Error("No collection specified");
		if (this.collections && !this.collections[collection])
			throw new Error("Collection not found");

		const { schema } = this.collections![collection];

		// Normalize the projection into something we understand, and which throws an error if we have any path collisions
		const normalizedProjection = this.normalizeProjection(projection);

		// Parse the projection into a mongo projection, and returns whether this query can be cached or not
		const parsedProjection = await this.parseFindProjection(
			normalizedProjection,
			schema.getDocument(),
			allowedRestricted
		);

		let cacheable = useCache !== false && parsedProjection.canCache;
		const { mongoProjection } = parsedProjection;

		// Parse the filter into a mongo filter, which also validates whether the filter is legal or not, and returns whether this query can be cached or not
		const parsedFilter = await this.parseFindFilter(
			filter,
			schema.getDocument(),
			allowedRestricted
		);

		cacheable = cacheable && parsedFilter.canCache;
		const { mongoFilter } = parsedFilter;
		let queryHash: string | null = null;
		let documents: Document[] | null = null;

		// If we can use cache, get from the cache, and if we get results return those
		// If we're allowed to cache, and the filter doesn't reference any restricted fields, try to cache the query and its response
		if (cacheable) {
			// Turn the query object into a md5 hash that can be used as a Redis key
			queryHash = createHash("md5")
				.update(
					JSON.stringify({
						collection,
						mongoFilter,
						limit,
						page
					})
				)
				.digest("hex");

			// Check if the query hash already exists in Redis, and get it if it is
			const cachedQuery = await this.redisClient?.GET(
				`query.find.${queryHash}`
			);

			// Return the mongoFilter along with the cachedDocuments, if any
			documents = cachedQuery ? JSON.parse(cachedQuery) : null;
		}

		// We got cached documents, so continue with those
		if (documents) {
			cacheable = false;
		} else {
			const totalCount = await this.collections?.[
				collection
			].collection.countDocuments(mongoFilter);
			if (totalCount === 0 || totalCount === undefined)
				return limit === 1 ? null : [];
			const lastPage = Math.ceil(totalCount / limit);
			if (lastPage < page)
				throw new Error(`The last page available is ${lastPage}`);

			// Create the Mongo cursor and then return the promise that gets the array of documents
			documents = (await this.collections?.[collection].collection
				.find(mongoFilter, mongoProjection)
				.limit(limit)
				.skip((page - 1) * limit)
				.toArray()) as Document[];
		}

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

		// Strips the document of any unneeded properties or properties that are restricted
		documents = await Promise.all(
			documents.map(async (document: Document) =>
				this.stripDocument(
					document,
					schema.getDocument(),
					normalizedProjection,
					allowedRestricted
				)
			)
		);

		if (!documents || documents!.length === 0)
			return limit === 1 ? null : [];
		return limit === 1 ? documents![0] : documents;
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
