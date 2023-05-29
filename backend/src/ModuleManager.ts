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
			data: "DataModule",
			events: "EventsModule",
			stations: "StationModule"
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
			data: await this.loadModule("data"),
			events: await this.loadModule("events"),
			stations: await this.loadModule("stations")
		};
	}

	/**
	 * startup - Handle startup
	 */
	public async startup() {
		await this.loadModules().catch(async err => {
			await this.shutdown();
			throw err;
		});
		if (!this.modules) throw new Error("No modules were loaded");
		await Promise.all(
			Object.values(this.modules).map(async module => {
				await module.startup().catch(async err => {
					module.setStatus(ModuleStatus.ERROR);
					throw err;
				});
			})
		).catch(async err => {
			await this.shutdown();
			throw err;
		});
		JobQueue.getPrimaryInstance().resume();
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
