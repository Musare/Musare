import JobContext from "src/JobContext";
import { UniqueMethods } from "../types/Modules";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";

export default class OtherModule extends BaseModule {
	/**
	 * Other Module
	 *
	 * @param moduleManager - Module manager class
	 */
	public constructor(moduleManager: ModuleManager) {
		super(moduleManager, "others");
	}

	/**
	 * startup - Startup other module
	 */
	public override startup(): Promise<void> {
		return new Promise((resolve, reject) => {
			super
				.startup()
				.then(() => {
					super.started();
					resolve();
				})
				.catch(err => reject(err));
		});
	}

	/**
	 * doThing - Do thing
	 *
	 * @param payload - Payload
	 * @returns Returned object
	 */
	public doThing(
		context: JobContext,
		payload: { test: string; test2: number }
	): Promise<{
		res: number;
	}> {
		return new Promise((resolve, reject) => {
			const { test, test2 } = payload;
			// console.log("doThing", test, test2);
			setTimeout(
				() =>
					Math.round(Math.random())
						? resolve({ res: 123 })
						: reject(),
				Math.random() * 1000
			);
		});
	}
}

export type OtherModuleJobs = {
	[Property in keyof UniqueMethods<OtherModule>]: {
		payload: Parameters<UniqueMethods<OtherModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<OtherModule>[Property]>>;
	};
};
