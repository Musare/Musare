import LogBook, { Log } from "./LogBook";
import ModuleManager from "./ModuleManager";
import { Modules } from "./types/Modules";

export enum ModuleStatus {
	LOADED = "LOADED",
	STARTING = "STARTING",
	STARTED = "STARTED",
	STOPPED = "STOPPED",
	STOPPING = "STOPPING",
	ERROR = "ERROR",
	DISABLED = "DISABLED"
}

export default abstract class BaseModule {
	protected moduleManager: ModuleManager;

	protected logBook: LogBook;

	protected name: string;

	protected status: ModuleStatus;

	protected dependentModules: (keyof Modules)[];

	/**
	 * Base Module
	 *
	 * @param name - Module name
	 */
	public constructor(name: string) {
		this.moduleManager = ModuleManager.getPrimaryInstance();
		this.logBook = LogBook.getPrimaryInstance();
		this.name = name;
		this.status = ModuleStatus.LOADED;
		this.dependentModules = [];
		this.log(`Module (${this.name}) loaded`);
	}

	/**
	 * getName - Get module name
	 *
	 * @returns name
	 */
	public getName() {
		return this.name;
	}

	/**
	 * getStatus - Get module status
	 *
	 * @returns status
	 */
	public getStatus() {
		return this.status;
	}

	/**
	 * setStatus - Set module status
	 *
	 * @param status - Module status
	 */
	public setStatus(status: ModuleStatus) {
		this.status = status;
	}

	/**
	 * getDependentModules - Get module dependencies
	 */
	public getDependentModules() {
		return this.dependentModules;
	}

	/**
	 * startup - Startup module
	 */
	public async startup() {
		this.log(`Module (${this.name}) starting`);
		this.setStatus(ModuleStatus.STARTING);
	}

	/**
	 * started - called with the module has started
	 */
	protected async started() {
		this.log(`Module (${this.name}) started`);
		this.setStatus(ModuleStatus.STARTED);
	}

	/**
	 * shutdown - Shutdown module
	 */
	public async shutdown() {
		this.log(`Module (${this.name}) stopping`);
		this.setStatus(ModuleStatus.STOPPING);
		await this.stopped();
	}

	/**
	 * stopped - called when the module has stopped
	 */
	protected async stopped() {
		this.log(`Module (${this.name}) stopped`);
		this.setStatus(ModuleStatus.STOPPED);
	}

	/**
	 * log - Add log to logbook
	 *
	 * @param log - Log message or object
	 */
	protected log(log: string | Omit<Log, "timestamp" | "category">) {
		const {
			message,
			type = undefined,
			data = {}
		} = {
			...(typeof log === "string" ? { message: log } : log)
		};
		this.logBook.log({
			message,
			type,
			category: `modules.${this.getName()}`,
			data: {
				moduleName: this.name,
				...data
			}
		});
	}
}
