import { Log } from "./LogBook";
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
	 * startup - Startup module
	 */
	public async startup() {
		this.log(`Module (${this.name}) starting`);
		this.setStatus("STARTING");
	}

	/**
	 * started - called with the module has started
	 */
	protected async started() {
		this.log(`Module (${this.name}) started`);
		this.setStatus("STARTED");
	}

	/**
	 * shutdown - Shutdown module
	 */
	public async shutdown() {
		this.log(`Module (${this.name}) stopping`);
		this.setStatus("STOPPING");
		await this.stopped();
	}

	/**
	 * stopped - called when the module has stopped
	 */
	protected async stopped() {
		this.log(`Module (${this.name}) stopped`);
		this.setStatus("STOPPED");
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
		this.moduleManager.logBook.log({
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
