import JobContext from "./JobContext";
import JobQueue from "./JobQueue";
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

	protected jobQueue: JobQueue;

	protected name: string;

	protected status: ModuleStatus;

	protected dependentModules: (keyof Modules)[];

	protected jobApiDefault: boolean;

	protected jobConfig: Record<
		string,
		| boolean
		| {
				api?: boolean;
				method?: (context: JobContext, payload?: any) => Promise<any>;
		  }
	>;

	protected jobs: Record<
		string,
		{
			api: boolean;
			method: (context: JobContext, payload?: any) => Promise<any>;
		}
	>;

	/**
	 * Base Module
	 *
	 * @param name - Module name
	 */
	public constructor(name: string) {
		this.moduleManager = ModuleManager.getPrimaryInstance();
		this.logBook = LogBook.getPrimaryInstance();
		this.jobQueue = JobQueue.getPrimaryInstance();
		this.name = name;
		this.status = ModuleStatus.LOADED;
		this.dependentModules = [];
		this.jobApiDefault = true;
		this.jobConfig = {};
		this.jobs = {};
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
	 * loadJobs - Load jobs available via api module
	 */
	private async loadJobs() {
		this.jobs = {};

		const module = Object.getPrototypeOf(this);
		await Promise.all(
			Object.getOwnPropertyNames(module).map(async property => {
				if (
					typeof module[property] !== "function" ||
					Object.prototype.hasOwnProperty.call(
						BaseModule.prototype,
						property
					)
				)
					return;

				const options = this.jobConfig[property];

				let api = this.jobApiDefault;
				if (
					typeof options === "object" &&
					typeof options.api === "boolean"
				)
					api = options.api;
				else if (typeof options === "boolean") api = options;

				this.jobs[property] = {
					api,
					method: module[property]
				};
			})
		);

		await Promise.all(
			Object.entries(this.jobConfig).map(async ([name, options]) => {
				if (
					typeof options === "object" &&
					typeof options.method === "function"
				) {
					if (this.jobs[name])
						throw new Error(`Job "${name}" is already defined`);

					this.jobs[name] = {
						api: options.api ?? this.jobApiDefault,
						method: options.method
					};
				}
			})
		);
	}

	/**
	 * getJob - Get module job
	 */
	public getJob(name: string) {
		if (!this.jobs[name]) throw new Error(`Job "${name}" not found.`);

		return this.jobs[name];
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
		await this.loadJobs();
		this.log(`Module (${this.name}) started`);
		this.setStatus(ModuleStatus.STARTED);
	}

	/**
	 * shutdown - Shutdown module
	 */
	public async shutdown() {
		this.log(`Module (${this.name}) stopping`);
		this.setStatus(ModuleStatus.STOPPING);
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
