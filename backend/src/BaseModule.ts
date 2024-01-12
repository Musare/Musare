import { readdir } from "fs/promises";
import path from "path";
import LogBook, { Log } from "@/LogBook";
import ModuleManager from "@/ModuleManager";
import Job from "./Job";
import { forEachIn } from "@/utils/forEachIn";

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
	protected _name: string;

	protected _status: ModuleStatus;

	protected _dependentModules: string[];

	protected _jobs: Record<string, typeof Job>;

	/**
	 * Base Module
	 *
	 * @param name - Module name
	 */
	public constructor(name: string) {
		this._name = name;
		this._status = ModuleStatus.LOADED;
		this._dependentModules = [];
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
		let jobs;

		try {
			jobs = await readdir(
				path.resolve(
					__dirname,
					`./modules/${this.constructor.name}/jobs`
				)
			);
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT"
			)
				return;

			throw error;
		}

		await forEachIn(jobs, async jobFile => {
			const { default: Job } = await import(
				`./modules/${this.constructor.name}/jobs/${jobFile}`
			);

			const jobName = Job.getName();

			this._jobs[jobName] = Job;
		});
	}

	/**
	 * getJob - Get module job
	 */
	public getJob(name: string) {
		const [, Job] =
			Object.entries(this._jobs).find(([jobName]) => jobName === name) ??
			[];

		if (!Job) throw new Error(`Job "${name}" not found.`);

		return Job;
	}

	/**
	 * getJobs - Get module jobs
	 */
	public getJobs() {
		return this._jobs;
	}

	/**
	 * canRunJobs - Determine if module can run jobs
	 */
	public canRunJobs() {
		return this.getDependentModules().reduce(
			(canRunJobs: boolean, moduleName: string): boolean => {
				if (canRunJobs === false) return false;

				return !!ModuleManager.getModule(moduleName)?.canRunJobs();
			},
			this.getStatus() === ModuleStatus.STARTED
		);
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
		LogBook.log({
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
