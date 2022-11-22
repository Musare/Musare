import JobContext from "../JobContext";
import { UniqueMethods } from "../types/Modules";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";

export default class StationModule extends BaseModule {
	/**
	 * Station Module
	 *
	 * @param moduleManager - Module manager class
	 */
	public constructor(moduleManager: ModuleManager) {
		super(moduleManager, "stations");
	}

	/**
	 * startup - Startup station module
	 */
	public override async startup() {
		await super.startup();
		this.log("Station Startup");
		await super.started();
	}

	/**
	 * addToQueue - Add media to queue
	 *
	 * @param payload - Payload
	 */
	public async addToQueue(context: JobContext, payload: { songId: string }) {
		const { songId } = payload;
		// console.log(`Adding song ${songId} to the queue.`);
		setTimeout(() => {
			if (Math.round(Math.random())) throw new Error();
		}, Math.random() * 1000);
	}

	public async addA(context: JobContext) {
		context.log("ADDA");
		await context.runJob("stations", "addB", {}, { priority: 5 });
		return { number: 123 };
	}

	public async addB(context: JobContext) {
		context.log("ADDB");
		await context.runJob("stations", "addC", {});
	}

	public addC(context: JobContext) {
		context.log("ADDC");
	}
}

export type StationModuleJobs = {
	[Property in keyof UniqueMethods<StationModule>]: {
		payload: Parameters<UniqueMethods<StationModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<StationModule>[Property]>>;
	};
};
