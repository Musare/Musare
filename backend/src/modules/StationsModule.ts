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

export default new StationsModule();
