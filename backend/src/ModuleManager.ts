import { ModuleStatus } from "@/BaseModule";
import JobQueue from "@/JobQueue";
import { Modules } from "@/types/Modules";

export class ModuleManager {
	private _modules?: Modules;

	/**
	 * getStatus - Get status of modules
	 *
	 * @returns Module statuses
	 */
	public getStatus() {
		const status: Record<string, ModuleStatus> = {};
		Object.entries(this._modules || {}).forEach(([name, module]) => {
			status[name] = module.getStatus();
		});
		return status;
	}

	/**
	 * Gets a module
	 *
	 */
	public getModule(moduleName: keyof Modules) {
		return this._modules && this._modules[moduleName];
	}

	/**
	 * loadModule - Load and initialize module
	 *
	 * @param moduleName - Name of the module
	 * @returns Module
	 */
	private async _loadModule<T extends keyof Modules>(moduleName: T) {
		const mapper = {
			cache: "CacheModule",
			data: "DataModule",
			events: "EventsModule",
			stations: "StationsModule",
			websocket: "WebSocketModule"
		};
		const { default: Module }: { default: Modules[T] } = await import(
			`./modules/${mapper[moduleName]}`
		);
		return Module;
	}

	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns Promise
	 */
	private async _loadModules() {
		this._modules = {
			cache: await this._loadModule("cache"),
			data: await this._loadModule("data"),
			events: await this._loadModule("events"),
			stations: await this._loadModule("stations"),
			websocket: await this._loadModule("websocket")
		};
	}

	/**
	 * startModule - Start module
	 */
	private async _startModule(module: Modules[keyof Modules]) {
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
			await this._startModule(dependency);
		}

		await module.startup().catch(async err => {
			module.setStatus(ModuleStatus.ERROR);
			throw err;
		});
	}

	/**
	 * getJobs - Get jobs for all modules
	 */
	public getJobs() {
		if (!this._modules) return [];

		return Object.fromEntries(
			Object.entries(this._modules).map(([name, module]) => [
				name,
				Object.fromEntries(
					Object.entries(module.getJobs()).map(([jobName, Job]) => [
						jobName,
						{ api: Job.isApiEnabled() }
					])
				)
			])
		);
	}

	/**
	 * startup - Handle startup
	 */
	public async startup() {
		try {
			await this._loadModules();

			if (!this._modules) throw new Error("No modules were loaded");

			for (const module of Object.values(this._modules)) {
				// eslint-disable-next-line no-await-in-loop
				await this._startModule(module);
			}

			JobQueue.resume();
		} catch (err) {
			await this.shutdown();
			throw err;
		}
	}

	/**
	 * shutdown - Handle shutdown
	 */
	public async shutdown() {
		if (this._modules) {
			const modules = Object.entries(this._modules).filter(([, module]) =>
				[
					ModuleStatus.STARTED,
					ModuleStatus.STARTING,
					ModuleStatus.ERROR
				].includes(module.getStatus())
			);

			const shutdownOrder: (keyof Modules)[] = [];

			for (const [name, module] of modules) {
				if (!shutdownOrder.includes(name)) shutdownOrder.push(name);

				const dependencies = module.getDependentModules();

				dependencies
					.filter(dependency => shutdownOrder.includes(dependency))
					.forEach(dependency => {
						shutdownOrder.splice(
							shutdownOrder.indexOf(dependency),
							1
						);
					});

				shutdownOrder.push(...dependencies);
			}

			for (const moduleName of shutdownOrder) {
				// eslint-disable-next-line no-await-in-loop
				await this.getModule(moduleName)?.shutdown();
			}
		}
	}
}

export default new ModuleManager();
