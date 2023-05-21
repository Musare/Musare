import config from "config";
import { createClient, RedisClientType } from "redis";
import mongoose from "mongoose";
import JobContext from "../JobContext";
import BaseModule from "../BaseModule";
import { UniqueMethods } from "../types/Modules";
import { Models, Schemas } from "../types/Models";

export default class DataModule extends BaseModule {
	private models?: Models;

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

		await mongoose.connect(mongoUrl);

		await this.loadModels();

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
			`../models/${modelName.toString()}`
		);
		return mongoose.model(modelName.toString(), schema);
	}

	/**
	 * loadModels - Load and initialize all models
	 *
	 * @returns Promise
	 */
	private async loadModels() {
		this.models = {
			abc: await this.loadModel("abc"),
			station: await this.loadModel("station")
		};
	}

	/**
	 * getModel - Get model
	 *
	 * @param modelName - Name of the model
	 * @returns Model
	 */
	public getModel<ModelName extends keyof Models>(
		jobContext: JobContext,
		modelName: ModelName
	) {
		if (!this.models) throw new Error("Models not loaded");
		return this.models[modelName];
	}
}

export type DataModuleJobs = {
	[Property in keyof UniqueMethods<DataModule>]: {
		payload: Parameters<UniqueMethods<DataModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<DataModule>[Property]>>;
	};
};
