import { UniqueMethods } from "@/types/Modules";
import BaseModule from "@/BaseModule";

export class StationsModule extends BaseModule {
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
}

export type StationsModuleJobs = {
	[Property in keyof UniqueMethods<StationsModule>]: {
		payload: Parameters<UniqueMethods<StationsModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<StationsModule>[Property]>>;
	};
};

export default new StationsModule();
