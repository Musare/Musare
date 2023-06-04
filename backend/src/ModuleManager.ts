import { ModuleStatus } from "./BaseModule";
import JobQueue from "./JobQueue";
import { Modules, ModuleClass } from "./types/Modules";

export default class ModuleManager {
	static primaryInstance = new this();

	private modules?: Modules;

	/**
	 * getStatus - Get status of modules
	 *
	 * @returns Module statuses
	 */
	public getStatus() {
		const status: Record<string, ModuleStatus> = {};
		Object.entries(this.modules || {}).forEach(([name, module]) => {
			status[name] = module.getStatus();
		});
		return status;
	}

	/**
	 * Gets a module
	 *
	 */
	public getModule(moduleName: keyof Modules) {
		return this.modules && this.modules[moduleName];
	}

	/**
	 * loadModule - Load and initialize module
	 *
	 * @param moduleName - Name of the module
	 * @returns Module
	 */
	private async loadModule<T extends keyof Modules>(moduleName: T) {
		const mapper = {
			api: "APIModule",
			data: "DataModule",
			events: "EventsModule",
			stations: "StationModule",
			websocket: "WebSocketModule"
		};
		const { default: Module }: { default: ModuleClass<Modules[T]> } =
			await import(`./modules/${mapper[moduleName]}`);
		return new Module();
	}

	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns Promise
	 */
	private async loadModules() {
		this.modules = {
			api: await this.loadModule("api"),
			data: await this.loadModule("data"),
			events: await this.loadModule("events"),
			stations: await this.loadModule("stations"),
			websocket: await this.loadModule("websocket")
		};
	}

	/**
	 * startModule - Start module
	 */
	private async startModule(module: Modules[keyof Modules]) {
		switch (module.getStatus()) {
			case ModuleStatus.STARTING:
			case ModuleStatus.STARTED:
				return;
			case ModuleStatus.ERROR:
				throw new Error("Dependent module failed to start");
			case ModuleStatus.STOPPING:
			case ModuleStatus.STOPPED:
			case ModuleStatus.DISABLED:
				throw new Error("Dependent module is unavailable");
			default:
				break;
		}

		for (const name of module.getDependentModules()) {
			const dependency = this.getModule(name);

			if (!dependency) throw new Error("Dependent module not found");

			// eslint-disable-next-line no-await-in-loop
			await this.startModule(dependency);
		}

		await module.startup().catch(async err => {
			module.setStatus(ModuleStatus.ERROR);
			throw err;
		});
	}

	/**
	 * startup - Handle startup
	 */
	public async startup() {
		try {
			await this.loadModules();

			if (!this.modules) throw new Error("No modules were loaded");

			for (const module of Object.values(this.modules)) {
				// eslint-disable-next-line no-await-in-loop
				await this.startModule(module);
			}

			JobQueue.getPrimaryInstance().resume();
		} catch (err) {
			await this.shutdown();
			throw err;
		}
	}

	/**
	 * shutdown - Handle shutdown
	 */
	public async shutdown() {
		if (this.modules)
			await Promise.all(
				Object.values(this.modules).map(async module => {
					if (
						[
							ModuleStatus.STARTED,
							ModuleStatus.STARTING,
							ModuleStatus.ERROR
						].includes(module.getStatus())
					)
						await module.shutdown();
				})
			);
	}

	static getPrimaryInstance(): ModuleManager {
		return this.primaryInstance;
	}

	static setPrimaryInstance(instance: ModuleManager) {
		this.primaryInstance = instance;
	}
}
