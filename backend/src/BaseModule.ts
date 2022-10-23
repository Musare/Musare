import ModuleManager from "./ModuleManager";
import { ModuleStatus } from "./types/ModuleStatus";

// type ModuleName = keyof Modules;

export default abstract class BaseModule {
	protected moduleManager: ModuleManager;

	protected name: string;

	protected status: ModuleStatus;

	/**
	 * Base Module
	 *
	 * @param {ModuleManager} moduleManager Module manager class
	 * @param {string} name Module name
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
	 * @returns {string} name
	 */
	public getName(): string {
		return this.name;
	}

	/**
	 * getStatus - Get module status
	 *
	 * @returns {ModuleStatus} status
	 */
	public getStatus(): ModuleStatus {
		return this.status;
	}

	/**
	 * setStatus - Set module status
	 *
	 * @param {ModuleStatus} status Module status
	 */
	protected setStatus(status: ModuleStatus): void {
		this.status = status;
	}

	/**
	 * startup - Startup module
	 */
	public startup(): void {
		console.log(`Module (${this.name}) starting`);
		this.setStatus("STARTING");
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
	public shutdown(): void {
		console.log(`Module (${this.name}) stopping`);
		this.setStatus("STOPPING");
	}

	/**
	 * stopped - called when the module has stopped
	 */
	protected stopped(): void {
		console.log(`Module (${this.name}) stopped`);
		this.setStatus("STOPPED");
	}
}
