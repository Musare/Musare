import { UniqueMethods } from "../types/TestModules";
import BaseModule from "../BaseModule";
import ModuleManager from "../ModuleManager";

export default class OtherModule extends BaseModule {
	/**
	 * Other Module
	 *
	 * @param {ModuleManager} moduleManager Module manager class
	 */
	public constructor(moduleManager: ModuleManager) {
		super(moduleManager, "others");
	}

	/**
	 * startup - Startup other module
	 */
	public override startup(): void {
		super.startup();

		console.log("Other Startup");

		super.started();
	}

	/**
	 * doThing - Do thing
	 *
	 * @param {object} payload Payload
	 * @param {string} payload.test Test1
	 * @param {number} payload.test2 Test2
	 * @returns {{ message: string }} Return object
	 */
	public doThing(payload: { test: string; test2: number }): Promise<{
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
		payload: Parameters<UniqueMethods<OtherModule>[Property]>[0];
		returns: Awaited<ReturnType<UniqueMethods<OtherModule>[Property]>>;
	};
};
