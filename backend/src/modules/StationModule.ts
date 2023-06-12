import JobContext from "../JobContext";
import { UniqueMethods } from "../types/Modules";
import BaseModule from "../BaseModule";

export default class StationModule extends BaseModule {
	/**
	 * Station Module
	 */
	public constructor() {
		super("stations");

		this._dependentModules = ["data"];
	}

	/**
	 * startup - Startup station module
	 */
	public override async startup() {
		await super.startup();
		this.log("Station Startup");
		await super._started();
	}

	/**
	 * shutdown - Shutdown station module
	 */
	public override async shutdown() {
		await super.shutdown();
		await super._stopped();
	}

	/**
	 * addToQueue - Add media to queue
	 *
	 * @param payload - Payload
	 */
	public async addToQueue(context: JobContext, payload: { songId: string }) {
		const { songId } = payload;
		context.log(`Adding song ${songId} to the queue.`);
		await new Promise((resolve, reject) => {
			setTimeout(() => {
				if (Math.round(Math.random())) reject(new Error("Test321"));
				else resolve(true);
			}, Math.random() * 1000);
		});
	}

	public async addA(context: JobContext) {
		context.log("ADDA");
		await context.jobQueue.runJob("stations", "addB", {}, { priority: 5 });
		return { number: 123 };
	}

	public async addB(context: JobContext) {
		context.log("ADDB");
		await context.jobQueue.runJob("stations", "addToQueue", {
			songId: "test"
		});
		await context.jobQueue.runJob("stations", "addC", {});
	}

	public async addC(context: JobContext) {
		context.log("ADDC");
		// await new Promise(() => {});
	}
}

export type StationModuleJobs = {
	[Property in keyof UniqueMethods<StationModule>]: {
		payload: Parameters<UniqueMethods<StationModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<StationModule>[Property]>>;
	};
};
