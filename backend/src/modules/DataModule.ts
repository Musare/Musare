import config from "config";
// import { createClient, RedisClientType } from "redis";
import mongoose, {
	Connection,
	isObjectIdOrHexString,
	MongooseDefaultQueryMiddleware,
	MongooseDistinctQueryMiddleware,
	MongooseQueryOrDocumentMiddleware,
	Types
} from "mongoose";
import { patchHistoryPlugin, patchEventEmitter } from "ts-patch-mongoose";
import { readdir } from "fs/promises";
import path from "path";
import JobContext from "../JobContext";
import BaseModule, { ModuleStatus } from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import { AnyModel, Models } from "../types/Models";
import { Schemas } from "../types/Schemas";
import documentVersionPlugin from "../schemas/plugins/documentVersion";
import getDataPlugin from "../schemas/plugins/getData";
import Migration from "../Migration";

/**
 * Experimental: function to get all nested keys from a MongoDB query object
 */
function getAllKeys(obj: object) {
	const keys: string[] = [];

	function processObject(obj: object, parentKey = "") {
		let returnChanged = false;

		// eslint-disable-next-line
		for (let key in obj) {
			// eslint-disable-next-line
			if (obj.hasOwnProperty(key)) {
				if (key.startsWith("$")) {
					// eslint-disable-next-line
					// @ts-ignore
					// eslint-disable-next-line
					processNestedObject(obj[key], parentKey); // Process nested keys without including the current key
					// eslint-disable-next-line
					continue; // Skip the current key
				}

				const currentKey = parentKey ? `${parentKey}.${key}` : key;

				// eslint-disable-next-line
				// @ts-ignore
				if (typeof obj[key] === "object" && obj[key] !== null) {
					// eslint-disable-next-line
					// @ts-ignore
					if (Array.isArray(obj[key])) {
						// eslint-disable-next-line
						// @ts-ignore
						// eslint-disable-next-line
						if (processArray(obj[key], currentKey)) {
							returnChanged = true;
							// eslint-disable-next-line
							continue;
						}
					}
					// eslint-disable-next-line
					// @ts-ignore
					else if (processObject(obj[key], currentKey)) {
						returnChanged = true;
						// eslint-disable-next-line
						continue;
					}
				}

				keys.push(currentKey);

				returnChanged = true;
			}
		}

		return returnChanged;
	}

	function processArray(arr: Array<any>, parentKey: string) {
		let returnChanged = false;

		for (let i = 0; i < arr.length; i += 1) {
			const currentKey = parentKey;

			if (typeof arr[i] === "object" && arr[i] !== null) {
				if (Array.isArray(arr[i])) {
					if (processArray(arr[i], currentKey)) returnChanged = true;
				} else if (processObject(arr[i], currentKey))
					returnChanged = true;
			}
		}

		return returnChanged;
	}

	function processNestedObject(obj: object, parentKey: string) {
		if (typeof obj === "object" && obj !== null) {
			if (Array.isArray(obj)) {
				processArray(obj, parentKey);
			} else {
				processObject(obj, parentKey);
			}
		}
	}

	processObject(obj);
	return keys;
}

export default class DataModule extends BaseModule {
	private _models?: Models;

	private _mongoConnection?: Connection;

	//	private _redisClient?: RedisClientType;

	/**
	 * Data Module
	 */
	public constructor() {
		super("data");

		this._dependentModules = ["events"];

		this._jobConfig = {
			getModel: false,
			find: "disabled",
			addC: "disabled"
		};
	}

	/**
	 * startup - Startup data module
	 */
	public override async startup() {
		await super.startup();

		await this._createMongoConnection();

		await this._runMigrations();

		await this._loadModels();

		await this._syncModelIndexes();

		await this._defineModelJobs();

		// @ts-ignore
		//        this._redisClient = createClient({ ...config.get("redis") });
		//
		//		await this._redisClient.connect();
		//
		//		const redisConfigResponse = await this._redisClient.sendCommand([
		//			"CONFIG",
		//			"GET",
		//			"notify-keyspace-events"
		//		]);
		//
		//		if (
		//			!(
		//				Array.isArray(redisConfigResponse) &&
		//				redisConfigResponse[1] === "xE"
		//			)
		//		)
		//			throw new Error(
		//				`notify-keyspace-events is NOT configured correctly! It is set to: ${
		//					(Array.isArray(redisConfigResponse) &&
		//						redisConfigResponse[1]) ||
		//					"unknown"
		//				}`
		//			);

		await super._started();
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override async shutdown() {
		await super.shutdown();
		//		if (this._redisClient) await this._redisClient.quit();
		patchEventEmitter.removeAllListeners();
		if (this._mongoConnection) await this._mongoConnection.close();
		await this._stopped();
	}

	/**
	 * createMongoConnection - Create mongo connection
	 */
	private async _createMongoConnection() {
		mongoose.set({
			runValidators: true,
			sanitizeFilter: true,
			strict: "throw",
			strictQuery: "throw"
		});

		const { user, password, host, port, database } = config.get<{
			user: string;
			password: string;
			host: string;
			port: number;
			database: string;
		}>("mongo");
		const mongoUrl = `mongodb://${user}:${password}@${host}:${port}/${database}`;

		this._mongoConnection = await mongoose
			.createConnection(mongoUrl)
			.asPromise();
	}

	/**
	 * registerEvents - Register events for schema with event module
	 */
	private async _registerEvents<
		ModelName extends keyof Models,
		SchemaType extends Schemas[keyof ModelName]
	>(modelName: ModelName, schema: SchemaType) {
		const methods: string[] = [
			"aggregate",
			"count",
			"countDocuments",
			"deleteOne",
			"deleteMany",
			"estimatedDocumentCount",
			"find",
			"findOne",
			"findOneAndDelete",
			"findOneAndRemove",
			"findOneAndReplace",
			"findOneAndUpdate",
			// "init",
			"insertMany",
			"remove",
			"replaceOne",
			"save",
			"update",
			"updateOne",
			"updateMany"
			// "validate"
		];

		methods.forEach(method => {
			// NOTE: some Mongo selectors may also search through linked documents. Prevent that
			schema.pre(method, async function () {
				console.log(`Pre-${method}! START`);

				if (
					this.options?.userContext &&
					["find", "update", "deleteOne", "save"].indexOf(method) ===
						-1
				)
					throw new Error("Method not allowed");

				console.log(`Pre-${method}!`, this.options?.userContext);

				if (["find", "update", "deleteOne"].indexOf(method) !== -1) {
					const filter = this.getFilter();
					const filterKeys = getAllKeys(filter);

					filterKeys.forEach(filterKey => {
						const splitFilterKeys = filterKey
							.split(".")
							.reduce(
								(keys: string[], key: string) =>
									keys.length > 0
										? [
												...keys,
												`${
													keys[keys.length - 1]
												}.${key}`
										  ]
										: [key],
								[]
							);
						splitFilterKeys.forEach(splitFilterKey => {
							const path = this.schema.path(splitFilterKey);
							if (!path) {
								throw new Error(
									"Attempted to query with non-existant property"
								);
							}
							if (path.options.restricted) {
								throw new Error(
									"Attempted to query with restricted property"
								);
							}
						});
					});

					console.log(`Pre-${method}!`, filterKeys);

					// Here we want to always exclude some properties depending on the model, like passwords/tokens
					this.projection({ restrictedName: 0 });
				}

				console.log(`Pre-${method}! END`);
			});

			schema.post(method, async function (docOrDocs) {
				console.log(`Post-${method} START!`);
				console.log(`Post-${method}!`, docOrDocs);
				console.log(`Post-${method}!`, this);
				console.log(`Post-${method} END!`);
			});
		});

		const { enabled, eventCreated, eventUpdated, eventDeleted } =
			schema.get("patchHistory") ?? {};

		if (!enabled) return;

		Object.entries({
			created: eventCreated,
			updated: eventUpdated,
			deleted: eventDeleted
		})
			.filter(([, event]) => !!event)
			.forEach(([action, event]) => {
				patchEventEmitter.on(event, async ({ doc }) => {
					await this._jobQueue.runJob("events", "publish", {
						channel: `model.${modelName}.${doc._id}.${action}`,
						value: doc
					});
				});
			});
	}

	/**
	 * loadModel - Import and load model schema
	 *
	 * @param modelName - Name of the model
	 * @returns Model
	 */
	private async _loadModel<ModelName extends keyof Models>(
		modelName: ModelName
	): Promise<Models[ModelName]> {
		if (!this._mongoConnection) throw new Error("Mongo is not available");

		const { schema }: { schema: Schemas[ModelName] } = await import(
			`../schemas/${modelName.toString()}`
		);

		schema.plugin(documentVersionPlugin);

		schema.set("timestamps", schema.get("timestamps") ?? true);

		const patchHistoryConfig = {
			enabled: true,
			patchHistoryDisabled: true,
			eventCreated: `${modelName}.created`,
			eventUpdated: `${modelName}.updated`,
			eventDeleted: `${modelName}.deleted`,
			...(schema.get("patchHistory") ?? {})
		};
		schema.set("patchHistory", patchHistoryConfig);

		if (patchHistoryConfig.enabled) {
			schema.plugin(patchHistoryPlugin, patchHistoryConfig);
		}

		const { enabled: getDataEnabled = false } = schema.get("getData") ?? {};

		if (getDataEnabled) schema.plugin(getDataPlugin);

		await this._registerEvents(modelName, schema);

		return this._mongoConnection.model(modelName.toString(), schema);
	}

	/**
	 * loadModels - Load and initialize all models
	 *
	 * @returns Promise
	 */
	private async _loadModels() {
		mongoose.SchemaTypes.String.set("trim", true);

		this._models = {
			abc: await this._loadModel("abc"),
			news: await this._loadModel("news"),
			session: await this._loadModel("session"),
			station: await this._loadModel("station"),
			user: await this._loadModel("user")
		};
	}

	/**
	 * syncModelIndexes - Sync indexes for all models
	 */
	private async _syncModelIndexes() {
		if (!this._models) throw new Error("Models not loaded");

		await Promise.all(
			Object.values(this._models).map(model => model.syncIndexes())
		);
	}

	/**
	 * getModel - Get model
	 *
	 * @returns Model
	 */
	public async getModel<ModelName extends keyof Models>(
		jobContext: JobContext,
		payload: ModelName | { name: ModelName }
	) {
		if (!this._models) throw new Error("Models not loaded");

		if (this.getStatus() !== ModuleStatus.STARTED)
			throw new Error("Module not started");

		const name = typeof payload === "object" ? payload.name : payload;

		return this._models[name];
	}

	private async _loadMigrations() {
		if (!this._mongoConnection) throw new Error("Mongo is not available");

		const migrations = await readdir(
			path.resolve(__dirname, "../schemas/migrations/")
		);

		return Promise.all(
			migrations.map(async migrationFile => {
				const { default: Migrate }: { default: typeof Migration } =
					await import(`../schemas/migrations/${migrationFile}`);
				return new Migrate(this._mongoConnection as Connection);
			})
		);
	}

	private async _runMigrations() {
		const migrations = await this._loadMigrations();

		for (let i = 0; i < migrations.length; i += 1) {
			const migration = migrations[i];
			// eslint-disable-next-line no-await-in-loop
			await migration.up();
		}
	}

	private async _defineModelJobs() {
		if (!this._models) throw new Error("Models not loaded");

		await Promise.all(
			Object.entries(this._models).map(async ([modelName, model]) => {
				await Promise.all(
					["create", "findById", "updateById", "deleteById"].map(
						async method => {
							this._jobConfig[`${modelName}.${method}`] = {
								method: async (context, payload) =>
									Object.getPrototypeOf(this)[`_${method}`](
										context,
										{
											...payload,
											modelName,
											model
										}
									)
							};
						}
					)
				);

				const jobConfig = model.schema.get("jobConfig");
				if (
					typeof jobConfig === "object" &&
					Object.keys(jobConfig).length > 0
				)
					await Promise.all(
						Object.entries(jobConfig).map(
							async ([name, options]) => {
								if (options === "disabled") {
									if (this._jobConfig[`${modelName}.${name}`])
										delete this._jobConfig[
											`${modelName}.${name}`
										];

									return;
								}

								let api = this._jobApiDefault;

								let method;

								const configOptions =
									this._jobConfig[`${modelName}.${name}`];
								if (typeof configOptions === "object") {
									if (typeof configOptions.api === "boolean")
										api = configOptions.api;
									if (
										typeof configOptions.method ===
										"function"
									)
										method = configOptions.method;
								} else if (typeof configOptions === "function")
									method = configOptions;
								else if (typeof configOptions === "boolean")
									api = configOptions;

								if (
									typeof options === "object" &&
									typeof options.api === "boolean"
								)
									api = options.api;
								else if (typeof options === "boolean")
									api = options;

								if (
									typeof options === "object" &&
									typeof options.method === "function"
								)
									method = async (...args) =>
										options.method.apply(model, args);
								else if (typeof options === "function")
									method = async (...args) =>
										options.apply(model, args);

								if (typeof method !== "function")
									throw new Error(
										`Job "${name}" has no function method defined`
									);

								this._jobConfig[`${modelName}.${name}`] = {
									api,
									method
								};
							}
						)
					);
			})
		);
	}

	private async _findById(
		context: JobContext,
		payload: {
			modelName: keyof Models;
			model: AnyModel;
			_id: Types.ObjectId;
		}
	) {
		const { modelName, model, _id } = payload ?? {};

		await context.assertPermission(`data.${modelName}.findById.${_id}`);

		const query = model.findById(_id);

		return query.exec();
	}

	private async _create(
		context: JobContext,
		payload: {
			modelName: keyof Models;
			model: AnyModel;
			query: Record<string, any[]>;
		}
	) {
		const { modelName, model, query } = payload ?? {};

		await context.assertPermission(`data.${modelName}.create`);

		if (typeof query !== "object")
			throw new Error("Query is not an object");
		if (Object.keys(query).length === 0)
			throw new Error("Empty query object provided");

		if (model.schema.path("createdBy"))
			query.createdBy = (await context.getUser())._id;

		return model.create(query);
	}

	private async _updateById(
		context: JobContext,
		payload: {
			modelName: keyof Models;
			model: AnyModel;
			_id: Types.ObjectId;
			query: Record<string, any[]>;
		}
	) {
		const { modelName, model, _id, query } = payload ?? {};

		await context.assertPermission(`data.${modelName}.updateById.${_id}`);

		if (!isObjectIdOrHexString(_id))
			throw new Error("_id is not an ObjectId");

		if (typeof query !== "object")
			throw new Error("Query is not an object");
		if (Object.keys(query).length === 0)
			throw new Error("Empty query object provided");

		return model.updateOne({ _id }, { $set: query });
	}

	private async _deleteById(
		context: JobContext,
		payload: {
			modelName: keyof Models;
			model: AnyModel;
			_id: Types.ObjectId;
		}
	) {
		const { modelName, model, _id } = payload ?? {};

		await context.assertPermission(`data.${modelName}.deleteById.${_id}`);

		if (!isObjectIdOrHexString(_id))
			throw new Error("_id is not an ObjectId");

		return model.deleteOne({ _id });
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
