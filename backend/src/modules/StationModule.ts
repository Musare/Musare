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
	public addToQueue(payload: { songId: string }): Promise<void> {
		return new Promise((resolve, reject) => {
			const { songId } = payload;
			// console.log(`Adding song ${songId} to the queue.`);
			setTimeout(
				() => (Math.round(Math.random()) ? resolve() : reject()),
				Math.random() * 1000
			);
		});
	}

	public addA(this: JobContext): Promise<{ number: number }> {
		return new Promise<{ number: number }>(resolve => {
			this.log("ADDA");
			this.runJob("stations", "addB", void 0, { priority: 5 }).then(
				() => {
					resolve({ number: 123 });
				}
			);
		});
	}

	public addB(this: JobContext): Promise<void> {
		return new Promise<void>(resolve => {
			this.log("ADDB");
			this.runJob("stations", "addC", void 0).then(() => {
				resolve();
			});
		});
	}

	public addC(this: JobContext): Promise<void> {
		return new Promise<void>(resolve => {
			this.log("ADDC");
			resolve();
		});
	}
}

export type StationModuleJobs = {
	[Property in keyof UniqueMethods<StationModule>]: {
		payload: Parameters<UniqueMethods<StationModule>[Property]>[0];
		returns: Awaited<ReturnType<UniqueMethods<StationModule>[Property]>>;
	};
};
