import JobContext from "src/JobContext";
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
	public override startup(): Promise<void> {
		return new Promise((resolve, reject) => {
			super
				.startup()
				.then(() => {
					this.log("Station Startup");
					super.started();
					resolve();
				})
				.catch(err => reject(err));
		});
	}

	/**
	 * addToQueue - Add media to queue
	 *
	 * @param payload - Payload
	 */
	public addToQueue(
		context: JobContext,
		payload: { songId: string }
	): Promise<void> {
		return new Promise((resolve, reject) => {
			const { songId } = payload;
			// console.log(`Adding song ${songId} to the queue.`);
			setTimeout(
				() => (Math.round(Math.random()) ? resolve() : reject()),
				Math.random() * 1000
			);
		});
	}

	public addA(context: JobContext): Promise<{ number: number }> {
		return new Promise<{ number: number }>(resolve => {
			context.log("ADDA");
			context.runJob("stations", "addB", {}, { priority: 5 }).then(() => {
				resolve({ number: 123 });
			});
		});
	}

	public addB(context: JobContext): Promise<void> {
		return new Promise<void>(resolve => {
			context.log("ADDB");
			context.runJob("stations", "addC", {}).then(() => {
				resolve();
			});
		});
	}

	public addC(context: JobContext): Promise<void> {
		return new Promise<void>(resolve => {
			context.log("ADDC");
			resolve();
		});
	}
}

export type StationModuleJobs = {
	[Property in keyof UniqueMethods<StationModule>]: {
		payload: Parameters<UniqueMethods<StationModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<StationModule>[Property]>>;
	};
};
