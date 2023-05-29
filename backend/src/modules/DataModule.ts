import config from "config";
// import { createClient, RedisClientType } from "redis";
import mongoose, {
	Connection,
	MongooseDefaultQueryMiddleware,
	MongooseDistinctQueryMiddleware,
	MongooseQueryOrDocumentMiddleware
} from "mongoose";
import { readdir } from "fs/promises";
import path from "path";
import JobContext from "../JobContext";
import BaseModule, { ModuleStatus } from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import { Models, Schemas } from "../types/Models";
import getDataPlugin from "../schemas/plugins/getData";
import Migration from "../Migration";

export default class DataModule extends BaseModule {
	private models?: Models;

	private mongoConnection?: Connection;

	//	private redisClient?: RedisClientType;

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

		const { user, password, host, port, database } = config.get<{
			user: string;
			password: string;
			host: string;
			port: number;
			database: string;
		}>("mongo");
		const mongoUrl = `mongodb://${user}:${password}@${host}:${port}/${database}`;

		this.mongoConnection = await mongoose
			.createConnection(mongoUrl)
			.asPromise();

		this.mongoConnection.set("runValidators", true);
		this.mongoConnection.set("sanitizeFilter", true);
		this.mongoConnection.set("strict", "throw");
		this.mongoConnection.set("strictQuery", "throw");

		mongoose.SchemaTypes.String.set("trim", true);

		this.mongoConnection.plugin(getDataPlugin, {
			tags: ["useGetDataPlugin"]
		});

		await this.runMigrations();

		await this.loadModels();

		await this.syncModelIndexes();

		// @ts-ignore
		//        this.redisClient = createClient({ ...config.get("redis") });
		//
		//		await this.redisClient.connect();
		//
		//		const redisConfigResponse = await this.redisClient.sendCommand([
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

		await super.started();
	}

	/**
	 * shutdown - Shutdown data module
	 */
	public override async shutdown() {
		await super.shutdown();
		//		if (this.redisClient) await this.redisClient.quit();
		if (this.mongoConnection) await this.mongoConnection.close();
	}

	/**
	 * loadModel - Import and load model schema
	 *
	 * @param modelName - Name of the model
	 * @returns Model
	 */
	private async loadModel<ModelName extends keyof Models>(
		modelName: ModelName
	) {
		if (!this.mongoConnection) throw new Error("Mongo is not available");

		const { schema }: { schema: Schemas[ModelName] } = await import(
			`../schemas/${modelName.toString()}`
		);

		const preMethods: string[] = [
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
			"init",
			"insertMany",
			"remove",
			"replaceOne",
			"save",
			"update",
			"updateOne",
			"updateMany",
			"validate"
		];

		preMethods.forEach(preMethod => {
			// @ts-ignore
			schema.pre(preMethods, () => {
				console.log(`Pre-${preMethod}!`);
			});
		});

		return this.mongoConnection.model(modelName.toString(), schema);
	}

	/**
	 * loadModels - Load and initialize all models
	 *
	 * @returns Promise
	 */
	private async loadModels() {
		this.models = {
			abc: await this.loadModel("abc"),
			news: await this.loadModel("news"),
			station: await this.loadModel("station")
		};
	}

	/**
	 * syncModelIndexes - Sync indexes for all models
	 */
	private async syncModelIndexes() {
		if (!this.models) throw new Error("Models not loaded");

		await Promise.all(
			Object.values(this.models).map(model => model.syncIndexes())
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
		if (!this.models) throw new Error("Models not loaded");

		if (this.getStatus() !== ModuleStatus.STARTED)
			throw new Error("Module not started");

		const name = typeof payload === "object" ? payload.name : payload;

		return this.models[name];
	}

	private async loadMigrations() {
		if (!this.mongoConnection) throw new Error("Mongo is not available");

		const migrations = await readdir(
			path.resolve(__dirname, "../schemas/migrations/")
		);

		return Promise.all(
			migrations.map(async migrationFile => {
				const { default: Migrate }: { default: typeof Migration } =
					await import(`../schemas/migrations/${migrationFile}`);
				return new Migrate(this.mongoConnection as Connection);
			})
		);
	}

	private async runMigrations() {
		const migrations = await this.loadMigrations();

		for (let i = 0; i < migrations.length; i += 1) {
			const migration = migrations[i];
			// eslint-disable-next-line no-await-in-loop
			await migration.up();
		}
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
