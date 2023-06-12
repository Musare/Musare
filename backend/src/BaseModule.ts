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
	protected _moduleManager: ModuleManager;

	protected _logBook: LogBook;

	protected _jobQueue: JobQueue;

	protected _name: string;

	protected _status: ModuleStatus;

	protected _dependentModules: (keyof Modules)[];

	protected _jobApiDefault: boolean;

	protected _jobConfig: Record<
		string,
		| boolean
		| {
				api?: boolean;
				method?: (context: JobContext, payload?: any) => Promise<any>;
		  }
	>;

	protected _jobs: Record<
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
		this._moduleManager = ModuleManager.getPrimaryInstance();
		this._logBook = LogBook.getPrimaryInstance();
		this._jobQueue = JobQueue.getPrimaryInstance();
		this._name = name;
		this._status = ModuleStatus.LOADED;
		this._dependentModules = [];
		this._jobApiDefault = true;
		this._jobConfig = {};
		this._jobs = {};
		this.log(`Module (${this._name}) loaded`);
	}

	/**
	 * getName - Get module name
	 *
	 * @returns name
	 */
	public getName() {
		return this._name;
	}

	/**
	 * getStatus - Get module status
	 *
	 * @returns status
	 */
	public getStatus() {
		return this._status;
	}

	/**
	 * setStatus - Set module status
	 *
	 * @param status - Module status
	 */
	public setStatus(status: ModuleStatus) {
		this._status = status;
	}

	/**
	 * getDependentModules - Get module dependencies
	 */
	public getDependentModules() {
		return this._dependentModules;
	}

	/**
	 * _loadJobs - Load jobs available via api module
	 */
	private async _loadJobs() {
		this._jobs = {};

		const module = Object.getPrototypeOf(this);
		await Promise.all(
			Object.getOwnPropertyNames(module).map(async property => {
				if (
					typeof module[property] !== "function" ||
					Object.prototype.hasOwnProperty.call(
						BaseModule.prototype,
						property
					) ||
					property.startsWith("_")
				)
					return;

				const options = this._jobConfig[property];

				let api = this._jobApiDefault;
				if (
					typeof options === "object" &&
					typeof options.api === "boolean"
				)
					api = options.api;
				else if (typeof options === "boolean") api = options;

				this._jobs[property] = {
					api,
					method: module[property]
				};
			})
		);

		await Promise.all(
			Object.entries(this._jobConfig).map(async ([name, options]) => {
				if (
					typeof options === "object" &&
					typeof options.method === "function"
				) {
					if (this._jobs[name])
						throw new Error(`Job "${name}" is already defined`);

					this._jobs[name] = {
						api: options.api ?? this._jobApiDefault,
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
		if (!this._jobs[name]) throw new Error(`Job "${name}" not found.`);

		return this._jobs[name];
	}

	/**
	 * getJobs - Get module jobs
	 */
	public getJobs() {
		return this._jobs;
	}

	/**
	 * startup - Startup module
	 */
	public async startup() {
		this.log(`Module (${this._name}) starting`);
		this.setStatus(ModuleStatus.STARTING);
	}

	/**
	 * started - called with the module has started
	 */
	protected async _started() {
		await this._loadJobs();
		this.log(`Module (${this._name}) started`);
		this.setStatus(ModuleStatus.STARTED);
	}

	/**
	 * shutdown - Shutdown module
	 */
	public async shutdown() {
		this.log(`Module (${this._name}) stopping`);
		this.setStatus(ModuleStatus.STOPPING);
	}

	/**
	 * stopped - called when the module has stopped
	 */
	protected async _stopped() {
		this.log(`Module (${this._name}) stopped`);
		this.setStatus(ModuleStatus.STOPPED);
	}

	/**
	 * log - Add log to logbook
	 *
	 * @param log - Log message or object
	 */
	public log(log: string | Omit<Log, "timestamp" | "category">) {
		const {
			message,
			type = undefined,
			data = {}
		} = {
			...(typeof log === "string" ? { message: log } : log)
		};
		this._logBook.log({
			message,
			type,
			category: `modules.${this.getName()}`,
			data: {
				moduleName: this._name,
				...data
			}
		});
	}
}
