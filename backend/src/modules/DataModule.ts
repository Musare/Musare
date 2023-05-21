import config from "config";
// import { createClient, RedisClientType } from "redis";
import mongoose, {
	MongooseDefaultQueryMiddleware,
	MongooseDistinctQueryMiddleware,
	MongooseQueryOrDocumentMiddleware
} from "mongoose";
import JobContext from "../JobContext";
import BaseModule, { ModuleStatus } from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import { Models, Schemas } from "../types/Models";

export default class DataModule extends BaseModule {
	private models?: Models;

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

		await mongoose.connect(mongoUrl);

		await this.loadModels();

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
		await mongoose.disconnect();
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

		return mongoose.model(modelName.toString(), schema);
	}

	/**
	 * loadModels - Load and initialize all models
	 *
	 * @returns Promise
	 */
	private async loadModels() {
		this.models = {
			abc: await this.loadModel("abc")
			//			station: await this.loadModel("station")
		};
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
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
