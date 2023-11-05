import config from "config";
import mongoose, {
	Connection,
	isObjectIdOrHexString,
	SchemaTypes,
	Types
} from "mongoose";
import { patchHistoryPlugin, patchEventEmitter } from "ts-patch-mongoose";
import { readdir } from "fs/promises";
import path from "path";
import updateVersioningPlugin from "mongoose-update-versioning";
import documentVersionPlugin from "@/models/plugins/documentVersion";
import getDataPlugin from "@/models/plugins/getData";
import Migration from "@/models/Migration";
import JobContext from "@/JobContext";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import { UniqueMethods } from "@/types/Modules";
import { AnyModel, Models } from "@/types/Models";
import { Schemas } from "@/types/Schemas";
import EventsModule from "./EventsModule";

export class DataModule extends BaseModule {
	private _models?: Models;

	private _mongoConnection?: Connection;

	/**
	 * Data Module
	 */
	public constructor() {
		super("data");

		this._dependentModules = ["events"];

		this._jobConfig = {
			getModel: "disabled"
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

		await super._started();
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override async shutdown() {
		await super.shutdown();
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
				patchEventEmitter.on(event, async ({ doc, oldDoc }) => {
					const modelId = doc?._id ?? oldDoc?._id;

					const Model = await this.getModel(modelName);

					if (doc) doc = Model.hydrate(doc);

					if (oldDoc) oldDoc = Model.hydrate(oldDoc);

					if (!modelId && action !== "created")
						throw new Error(`Model Id not found for "${event}"`);

					const channel = `model.${modelName}.${action}`;

					await EventsModule.publish(channel, { doc, oldDoc });

					if (action !== "created")
						await EventsModule.publish(`${channel}.${modelId}`, {
							doc,
							oldDoc
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
			`../models/schemas/${modelName.toString()}/schema`
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

		schema.set("toObject", { getters: true, virtuals: true });
		schema.set("toJSON", { getters: true, virtuals: true });

		schema.virtual("_name").get(() => modelName);

		schema.plugin(updateVersioningPlugin);

		await Promise.all(
			Object.entries(schema.paths)
				.filter(
					([, type]) =>
						type instanceof SchemaTypes.ObjectId ||
						(type instanceof SchemaTypes.Array &&
							type.caster instanceof SchemaTypes.ObjectId)
				)
				.map(async ([key, type]) => {
					const { ref } =
						(type instanceof SchemaTypes.ObjectId
							? type?.options
							: type.caster?.options) ?? {};

					if (ref)
						schema.path(key).get(value => {
							if (
								typeof value === "object" &&
								type instanceof SchemaTypes.ObjectId
							)
								return {
									_id: value,
									_name: ref
								};

							if (
								Array.isArray(value) &&
								type instanceof SchemaTypes.Array
							)
								return value.map(item =>
									item === null
										? null
										: {
												_id: item,
												_name: ref
										  }
								);

							return value;
						});
				})
		);

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
			sessions: await this._loadModel("sessions"),
			stations: await this._loadModel("stations"),
			users: await this._loadModel("users")
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
	public async getModel<ModelName extends keyof Models>(name: ModelName) {
		if (!this._models) throw new Error("Models not loaded");

		if (this.getStatus() !== ModuleStatus.STARTED)
			throw new Error("Module not started");

		return this._models[name];
	}

	private async _loadMigrations() {
		if (!this._mongoConnection) throw new Error("Mongo is not available");

		const migrations = await readdir(
			path.resolve(__dirname, "../models/migrations/")
		);

		return Promise.all(
			migrations.map(async migrationFile => {
				const { default: Migrate }: { default: typeof Migration } =
					await import(`../models/migrations/${migrationFile}`);
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

								let api = this._jobConfigDefault === true;

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
								else if (
									this._jobConfigDefault === "disabled"
								) {
									if (this._jobConfig[`${modelName}.${name}`])
										delete this._jobConfig[
											`${modelName}.${name}`
										];

									return;
								}

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

export default new DataModule();
