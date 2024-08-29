import config from "config";
import { readdir } from "fs/promises";
import path from "path";
import { forEachIn } from "@common/utils/forEachIn";
import { Sequelize, Model as SequelizeModel, ModelStatic } from "sequelize";
import { Dirent } from "fs";
import * as inflection from "inflection";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import EventsModule from "./EventsModule";
import DataModuleJob from "./DataModule/DataModuleJob";
import Job from "@/Job";

export class DataModule extends BaseModule {
	private _sequelize?: Sequelize;

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

		await this._setupSequelize();

		// await this._runMigrations();

		await super._started();
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override async shutdown() {
		await super.shutdown();
		await this._sequelize?.close();
		await this._stopped();
	}

	/**
	 * setupSequelize - Setup sequelize instance
	 */
	private async _setupSequelize() {
		const { username, password, host, port, database } = config.get<any>("postgres");
		this._sequelize = new Sequelize(database, username, password, {
			host,
			port,
			dialect: "postgres",
			logging: message => this.log(message)
		});

		await this._sequelize.authenticate();

		await forEachIn(
			await readdir(
				path.resolve(__dirname, `./${this.constructor.name}/models`),
				{
					withFileTypes: true
				}
			),
			async modelFile => {
				if (!modelFile.isFile() || modelFile.name.includes(".spec."))
					return;

				const {
					default: ModelClass,
					schema,
					options = {},
					setup
				} = await import(`${modelFile.path}/${modelFile.name}`);

				const tableName = inflection.camelize(
					inflection.pluralize(ModelClass.name),
					true
				);

				ModelClass.init(schema, {
					tableName,
					...options,
					sequelize: this._sequelize
				});

				if (typeof setup === "function") await setup();

				await this._loadModelEvents(ModelClass.name);

				await this._loadModelJobs(ModelClass.name);
			}
		);

		this._sequelize.sync();
	}

	// /**
	//  * registerEvents - Register events for schema with event module
	//  */
	// private async _registerEvents(modelName: string, schema: Schema<any>) {
	// 	const { enabled, eventCreated, eventUpdated, eventDeleted } =
	// 		schema.get("patchHistory") ?? {};

	// 	if (!enabled) return;

	// 	Object.entries({
	// 		created: eventCreated,
	// 		updated: eventUpdated,
	// 		deleted: eventDeleted
	// 	})
	// 		.filter(([, event]) => !!event)
	// 		.forEach(([action, event]) => {
	// 			patchEventEmitter.on(event!, async ({ doc, oldDoc }) => {
	// 				const modelId = doc?._id ?? oldDoc?._id;

	// 				const Model = await this.getModel(modelName);

	// 				if (doc) doc = Model.hydrate(doc);

	// 				if (oldDoc) oldDoc = Model.hydrate(oldDoc);

	// 				if (!modelId && action !== "created")
	// 					throw new Error(`Model Id not found for "${event}"`);

	// 				const EventClass = this.getEvent(`${modelName}.${action}`);

	// 				await EventsModule.publish(
	// 					new EventClass({ doc, oldDoc }, modelId)
	// 				);
	// 			});
	// 		});
	// }

	// /**
	//  * registerEvents - Register events for schema with event module
	//  */
	// private async _registerEventListeners(schema: Schema<any>) {
	// 	const eventListeners = schema.get("eventListeners");

	// 	if (
	// 		typeof eventListeners !== "object" ||
	// 		Object.keys(eventListeners).length === 0
	// 	)
	// 		return;

	// 	await forEachIn(
	// 		Object.entries(eventListeners),
	// 		async ([event, callback]) =>
	// 			EventsModule.pSubscribe(event, callback)
	// 	);
	// }

	/**
	 * getModel - Get model
	 *
	 * @returns Model
	 */
	public async getModel<ModelType extends SequelizeModel<any>>(
		name: string
	): Promise<ModelStatic<ModelType>> {
		if (!this._sequelize?.models) throw new Error("Models not loaded");

		if (this.getStatus() !== ModuleStatus.STARTED)
			throw new Error("Module not started");

		return this._sequelize.model(name) as ModelStatic<ModelType>;
	}

	private async _loadModelJobs(modelClassName: string) {
		let jobs: Dirent[];

		try {
			jobs = await readdir(
				path.resolve(
					__dirname,
					`./${this.constructor.name}/models/${modelClassName}/jobs/`
				),
				{
					withFileTypes: true
				}
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
			if (!jobFile.isFile() || jobFile.name.includes(".spec.")) return;

			const { default: JobClass } = await import(
				`${jobFile.path}/${jobFile.name}`
			);

			this._jobs[JobClass.getName()] = JobClass;
		});
	}

	private async _loadModelEvents(modelClassName: string) {
		let events: Dirent[];

		try {
			events = await readdir(
				path.resolve(
					__dirname,
					`./${this.constructor.name}/models/${modelClassName}/events/`
				),
				{
					withFileTypes: true
				}
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

		await forEachIn(events, async eventFile => {
			if (!eventFile.isFile() || eventFile.name.includes(".spec."))
				return;

			const { default: EventClass } = await import(
				`${eventFile.path}/${eventFile.name}`
			);

			this._events[EventClass.getName()] = EventClass;
		});
	}
}

export default new DataModule();
