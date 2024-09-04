import config from "config";
import { readdir } from "fs/promises";
import path from "path";
import { forEachIn } from "@common/utils/forEachIn";
import {
	Sequelize,
	Model as SequelizeModel,
	ModelStatic,
	DataTypes,
	Utils
} from "sequelize";
import { Dirent } from "fs";
import * as inflection from "inflection";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import DataModuleJob from "./DataModule/DataModuleJob";
import Job from "@/Job";

export type ObjectIdType = string;

// TODO fix TS
// TODO implement actual checking of ObjectId's
// TODO move to a better spot
// Strange behavior would result if we extended DataTypes.ABSTRACT because
// it's a class wrapped in a Proxy by Utils.classToInvokable.
class OBJECTID extends DataTypes.ABSTRACT.prototype.constructor {
	// Mandatory: set the type key
	static key = "OBJECTID";

	key = OBJECTID.key;

	// Mandatory: complete definition of the new type in the database
	toSql() {
		return "VARCHAR(24)";
	}

	// Optional: validator function
	// @ts-ignore
	validate(value, options) {
		return true;
		// return (typeof value === 'number') && (!Number.isNaN(value));
	}

	// Optional: sanitizer
	// @ts-ignore
	_sanitize(value) {
		return value;
		// Force all numbers to be positive
		// return value < 0 ? 0 : Math.round(value);
	}

	// Optional: value stringifier before sending to database
	// @ts-ignore
	_stringify(value) {
		return value;
		// return value.toString();
	}

	// Optional: parser for values received from the database
	// @ts-ignore
	static parse(value) {
		return value;
		// return Number.parseInt(value);
	}
}

// Optional: add the new type to DataTypes. Optionally wrap it on `Utils.classToInvokable` to
// be able to use this datatype directly without having to call `new` on it.
DataTypes.OBJECTID = Utils.classToInvokable(OBJECTID);

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
		const { username, password, host, port, database } =
			config.get<any>("postgres");
		this._sequelize = new Sequelize(database, username, password, {
			host,
			port,
			dialect: "postgres",
			logging: message =>
				this.log({
					type: "debug",
					category: "sql",
					message
				})
		});

		await this._sequelize.authenticate();

		const setupAssociationFunctions: Function[] = [];

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
					setup,
					setupAssociations
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

				if (typeof setupAssociations === "function")
					setupAssociationFunctions.push(setupAssociations);

				await this._loadModelEvents(ModelClass.name);

				await this._loadModelJobs(ModelClass.name);
			}
		);

		setupAssociationFunctions.forEach(setupAssociation => {
			setupAssociation();
		});

		await this._sequelize.sync();

		// TODO move to a better spot and improve
		try {
			await this._sequelize.query(`DROP TABLE IF EXISTS "minifiedUsers"`);
		} catch (err) {}
		await this._sequelize.query(
			`CREATE OR REPLACE VIEW "minifiedUsers" AS SELECT _id, username, name, role FROM users`
		);
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

		// TODO check if we want to do it via singularize&camelize, or another way
		const camelizedName = inflection.singularize(inflection.camelize(name));

		return this._sequelize.model(camelizedName) as ModelStatic<ModelType>; // This fails - news has not been defined
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
			) {
				this.log(
					`Loading ${modelClassName} jobs failed - folder doesn't exist`
				);
				return;
			}

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
