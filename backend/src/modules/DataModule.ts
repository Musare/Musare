import config from "config";
import mongoose, { Connection, Model, Schema, SchemaTypes } from "mongoose";
import { patchHistoryPlugin, patchEventEmitter } from "ts-patch-mongoose";
import { readdir } from "fs/promises";
import path from "path";
import updateVersioningPlugin from "mongoose-update-versioning";
import Migration from "@/modules/DataModule/Migration";
import documentVersionPlugin from "@/modules/DataModule/plugins/documentVersion";
import getDataPlugin from "@/modules/DataModule/plugins/getData";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import EventsModule from "./EventsModule";
import DataModuleJob from "./DataModule/DataModuleJob";
import Job from "@/Job";
import { forEachIn } from "@/utils/forEachIn";

export class DataModule extends BaseModule {
	private _models?: Record<string, Model<any>>;

	private _mongoConnection?: Connection;

	declare _jobs: Record<string, typeof Job | typeof DataModuleJob>;

	/**
	 * Data Module
	 */
	public constructor() {
		super("data");

		this._dependentModules = ["events"];
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

		await this._loadModelJobs();

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
	private async _registerEvents(modelName: string, schema: Schema<any>) {
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
				patchEventEmitter.on(event!, async ({ doc, oldDoc }) => {
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
	 * registerEvents - Register events for schema with event module
	 */
	private async _registerEventListeners(schema: Schema<any>) {
		const eventListeners = schema.get("eventListeners");

		if (
			typeof eventListeners !== "object" ||
			Object.keys(eventListeners).length === 0
		)
			return;

		await forEachIn(
			Object.entries(eventListeners),
			async ([event, callback]) =>
				EventsModule.subscribe("event", event, callback)
		);
	}

	/**
	 * loadModel - Import and load model schema
	 *
	 * @param modelName - Name of the model
	 * @returns Model
	 */
	private async _loadModel(modelName: string): Promise<Model<any>> {
		if (!this._mongoConnection) throw new Error("Mongo is not available");

		const { schema }: { schema: Schema<any> } = await import(
			`./DataModule/models/${modelName.toString()}/schema`
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

		await this._registerEventListeners(schema);

		schema.set("toObject", { getters: true, virtuals: true });
		schema.set("toJSON", { getters: true, virtuals: true });

		schema.virtual("_name").get(() => modelName);

		schema.plugin(updateVersioningPlugin);

		await forEachIn(
			Object.entries(schema.paths).filter(
				([, type]) =>
					type instanceof SchemaTypes.ObjectId ||
					(type instanceof SchemaTypes.Array &&
						type.caster instanceof SchemaTypes.ObjectId)
			),
			async ([key, type]) => {
				const { ref } =
					(type instanceof SchemaTypes.Array
						? type.caster?.options
						: type?.options) ?? {};

				if (ref)
					schema.path(key).get((value: any) => {
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
			}
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

		await forEachIn(Object.values(this._models), model =>
			model.syncIndexes()
		);
	}

	/**
	 * getModel - Get model
	 *
	 * @returns Model
	 */
	public async getModel<ModelType extends Model<any>>(
		name: string
	): Promise<ModelType> {
		if (!this._models) throw new Error("Models not loaded");

		if (this.getStatus() !== ModuleStatus.STARTED)
			throw new Error("Module not started");

		if (!this._models[name]) throw new Error("Model not found");

		return this._models[name] as ModelType;
	}

	private async _loadModelMigrations(modelName: string) {
		if (!this._mongoConnection) throw new Error("Mongo is not available");

		let migrations;

		try {
			migrations = await readdir(
				path.resolve(
					__dirname,
					`./DataModule/models/${modelName}/migrations/`
				)
			);
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT"
			)
				return [];

			throw error;
		}

		return forEachIn(migrations, async migrationFile => {
			const { default: Migrate }: { default: typeof Migration } =
				await import(
					`./DataModule/models/${modelName}/migrations/${migrationFile}`
				);
			return new Migrate(this._mongoConnection as Connection);
		});
	}

	private async _loadMigrations() {
		const models = await readdir(
			path.resolve(__dirname, "./DataModule/models/")
		);

		return forEachIn(models, async modelName =>
			this._loadModelMigrations(modelName)
		);
	}

	private async _runMigrations() {
		const migrations = (await this._loadMigrations()).flat();

		for (let i = 0; i < migrations.length; i += 1) {
			const migration = migrations[i];
			// eslint-disable-next-line no-await-in-loop
			await migration.up();
		}
	}

	private async _loadModelJobs() {
		if (!this._models) throw new Error("Models not loaded");

		await forEachIn(Object.keys(this._models), async modelName => {
			let jobs;

			try {
				jobs = await readdir(
					path.resolve(
						__dirname,
						`./${this.constructor.name}/models/${modelName}/jobs/`
					)
				);
			} catch (error) {
				if (
					error instanceof Error &&
					"code" in error &&
					error.code === "ENOENT"
				)
					return;

				throw error;
			}

			await forEachIn(jobs, async jobFile => {
				const { default: Job } = await import(
					`./${this.constructor.name}/models/${modelName}/jobs/${jobFile}`
				);

				this._jobs[Job.getName()] = Job;
			});
		});
	}
}

export default new DataModule();
