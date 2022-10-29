import ModuleManager from "./ModuleManager";
import { ModuleStatus } from "./types/Modules";

// type ModuleName = keyof Modules;

export default abstract class BaseModule {
	protected moduleManager: ModuleManager;

	protected name: string;

	protected status: ModuleStatus;

	/**
	 * Base Module
	 *
	 * @param moduleManager - Module manager class
	 * @param name - Module name
	 */
	public constructor(moduleManager: ModuleManager, name: string) {
		this.moduleManager = moduleManager;
		this.name = name;
		this.status = "LOADED";
		// console.log(`Module (${this.name}) starting`);
	}

	/**
	 * getName - Get module name
	 *
	 * @returns name
	 */
	public getName(): string {
		return this.name;
	}

	/**
	 * getStatus - Get module status
	 *
	 * @returns status
	 */
	public getStatus(): ModuleStatus {
		return this.status;
	}

	/**
	 * setStatus - Set module status
	 *
	 * @param status - Module status
	 */
	public setStatus(status: ModuleStatus): void {
		this.status = status;
	}

	/**
	 * startup - Startup module
	 */
	public startup(): Promise<void> {
		return new Promise(resolve => {
			console.log(`Module (${this.name}) starting`);
			this.setStatus("STARTING");
			resolve();
		});
	}

	/**
	 * started - called with the module has started
	 */
	protected started(): void {
		console.log(`Module (${this.name}) started`);
		this.setStatus("STARTED");
	}

	/**
	 * shutdown - Shutdown module
	 */
	public shutdown(): Promise<void> {
		return new Promise(resolve => {
			console.log(`Module (${this.name}) stopping`);
			this.setStatus("STOPPING");
			this.stopped();
			resolve();
		});
	}

	/**
	 * stopped - called when the module has stopped
	 */
	protected stopped(): void {
		console.log(`Module (${this.name}) stopped`);
		this.setStatus("STOPPED");
	}
}
