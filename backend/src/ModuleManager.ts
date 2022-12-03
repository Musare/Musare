import BaseModule from "./BaseModule";
import Job from "./Job";
import JobContext from "./JobContext";
import JobQueue from "./JobQueue";
import LogBook from "./LogBook";
import { JobOptions } from "./types/JobOptions";
import { Jobs, Modules, ModuleStatus, ModuleClass } from "./types/Modules";

export default class ModuleManager {
	private modules?: Modules;

	public logBook: LogBook;

	private jobQueue: JobQueue;

	/**
	 * Module Manager
	 *
	 * @param logBook - Logbook
	 */
	public constructor(logBook: LogBook) {
		this.logBook = logBook;
		this.jobQueue = new JobQueue(this, logBook);
	}

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
	 * getJobsStats - Get statistics of job queue
	 *
	 * @returns Job queue statistics
	 */
	public getJobsStats() {
		return this.jobQueue.getStats();
	}

	/**
	 * getJobsStatus - Get status of job queue
	 *
	 * @returns Job queue status
	 */
	public getJobsStatus() {
		return this.jobQueue.getStatus();
	}

	/**
	 * getQueueStatus - Get status of queued jobs
	 *
	 * @returns Job statuses
	 */
	public getQueueStatus() {
		return this.jobQueue.getQueueStatus();
	}

	/**
	 * Gets a job from the queue by jobId
	 *
	 * @returns Job
	 */
	public getJob(jobId: string, recursive = false) {
		return this.jobQueue.getJob(jobId, recursive);
	}

	/**
	 * Gets a list of all jobs running directly in the ModuleManager job queue
	 */
	public getJobs() {
		return this.jobQueue.getJobs();
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
			// events: "EventsModule",
			stations: "StationModule"
		};
		const { default: Module }: { default: ModuleClass<Modules[T]> } =
			await import(`./modules/${mapper[moduleName]}`);
		return new Module(this);
	}

	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns Promise
	 */
	private async loadModules() {
		this.modules = {
			data: await this.loadModule("data"),
			// events: await this.loadModule("events"),
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
					module.setStatus("ERROR");
					throw err;
				});
			})
		).catch(async err => {
			await this.shutdown();
			throw err;
		});
		this.jobQueue.resume();
	}

	/**
	 * shutdown - Handle shutdown
	 */
	public async shutdown() {
		if (this.modules)
			await Promise.all(
				Object.values(this.modules).map(async module => {
					if (
						module.getStatus() === "STARTED" ||
						module.getStatus() === "STARTING" ||
						module.getStatus() === "ERROR"
					)
						await module.shutdown();
				})
			);
	}

	/**
	 * runJob - Run a job
	 *
	 * @param moduleName - Module name
	 * @param jobName - Job name
	 * @param params - Params
	 */
	public runJob<
		ModuleNameType extends keyof Jobs & keyof Modules,
		JobNameType extends keyof Jobs[ModuleNameType] &
			keyof Omit<Modules[ModuleNameType], keyof BaseModule>,
		PayloadType extends "payload" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["payload"] extends undefined
				? Record<string, never>
				: Jobs[ModuleNameType][JobNameType]["payload"]
			: Record<string, never>,
		ReturnType = "returns" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["returns"]
			: never
	>(
		moduleName: ModuleNameType,
		jobName: JobNameType,
		payload: PayloadType,
		options?: JobOptions
	): Promise<ReturnType> {
		return this.jobQueue.runJob(moduleName, jobName, payload, options);
	}
}
