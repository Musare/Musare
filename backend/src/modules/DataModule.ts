import config from "config";
import { readdir } from "fs/promises";
import path from "path";
import { forEachIn } from "@common/utils/forEachIn";
import {
	Sequelize,
	Model as SequelizeModel,
	ModelStatic,
	DataTypes,
	Utils,
	ModelOptions,
	Options
} from "sequelize";
import { Dirent } from "fs";
import * as inflection from "inflection";
import { SequelizeStorage, Umzug } from "umzug";
import BaseModule, { ModuleStatus } from "@/BaseModule";
import DataModuleJob from "./DataModule/DataModuleJob";
import Job from "@/Job";
import EventsModule from "./EventsModule";

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

	private async _createSequelizeInstance(options: Options = {}) {
		const { username, password, host, port, database } =
			config.get<any>("postgres");

		const sequelize = new Sequelize(database, username, password, {
			host,
			port,
			dialect: "postgres",
			logging: message =>
				this.log({
					type: "debug",
					category: "sql",
					message
				}),
			...options
		});

		await sequelize.authenticate();

		return sequelize;
	}

	/**
	 * setupSequelize - Setup sequelize instance
	 */
	private async _setupSequelize() {
		this._sequelize = await this._createSequelizeInstance({
			define: {
				hooks: this._getSequelizeHooks()
			}
		});

		await this._sequelize.authenticate();

		const setupFunctions: Function[] = [];

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

				if (typeof setup === "function") setupFunctions.push(setup);

				await this._loadModelEvents(ModelClass.name);

				await this._loadModelJobs(ModelClass.name);
			}
		);

		await forEachIn(setupFunctions, setup => setup());

		await this._sequelize.sync();

		await this._runMigrations();
	}

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

	private _getSequelizeHooks(): ModelOptions<SequelizeModel>["hooks"] {
		return {
			afterSave: console.log,
			afterCreate: async model => {
				const modelName = (
					model.constructor as ModelStatic<any>
				).getTableName();
				let EventClass;

				try {
					EventClass = this.getEvent(`${modelName}.created`);
				} catch (error) {
					// TODO: Catch and ignore only event not found
					return;
				}

				EventsModule.publish(
					new EventClass({
						doc: model.get()
					})
				);
			},
			afterUpdate: async model => {
				const modelName = (
					model.constructor as ModelStatic<any>
				).getTableName();
				let EventClass;

				try {
					EventClass = this.getEvent(`${modelName}.updated`);
				} catch (error) {
					// TODO: Catch and ignore only event not found
					return;
				}

				EventsModule.publish(
					new EventClass(
						{
							doc: model.get(),
							oldDoc: model.previous()
						},
						model.get("_id") ?? model.previous("_id")
					)
				);
			},
			afterDestroy: async model => {
				const modelName = (
					model.constructor as ModelStatic<any>
				).getTableName();
				let EventClass;

				try {
					EventClass = this.getEvent(`${modelName}.deleted`);
				} catch (error) {
					// TODO: Catch and ignore only event not found
					return;
				}

				EventsModule.publish(
					new EventClass(
						{
							oldDoc: model.previous()
						},
						model.previous("_id")
					)
				);
			}
		};
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

	private async _runMigrations() {
		const sequelize = await this._createSequelizeInstance({
			logging: message =>
				this.log({
					type: "debug",
					category: "migrations.sql",
					message
				})
		});

		const migrator = new Umzug({
			migrations: {
				glob: [
					`${this.constructor.name}/migrations/*.ts`,
					{ cwd: __dirname }
				]
			},
			context: sequelize,
			storage: new SequelizeStorage({
				sequelize: sequelize!
			}),
			logger: console
		});

		await migrator.up();

		await sequelize.close();
	}
}

export default new DataModule();
