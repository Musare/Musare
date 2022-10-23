import { UniqueMethods } from "../types/TestModules";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";

export default class StationModule extends BaseModule {
	/**
	 * Station Module
	 *
	 * @param {ModuleManager} moduleManager Module manager class
	 */
	public constructor(moduleManager: ModuleManager) {
		super(moduleManager, "stations");
	}

	/**
	 * startup - Startup station module
	 */
	public override startup(): void {
		super.startup();

		console.log("Station Startup");

		super.started();
	}

	/**
	 * addToQueue - Add media to queue
	 *
	 * @param {object} payload Payload
	 * @param {string} payload.songId Song ID
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

	/**
	 *
	 * @returns {{ number: number }} return
	 */
	public addA(): Promise<{ number: number }> {
		return new Promise<{ number: number }>(resolve => {
			resolve({ number: 123 });
		});
	}

	/**
	 *
	 */
	public addB(): Promise<void> {
		return new Promise<void>(resolve => {
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
