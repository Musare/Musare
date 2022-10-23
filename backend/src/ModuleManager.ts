import BaseModule from "./BaseModule";
import Job from "./Job";
import JobQueue from "./JobQueue";
import { ModuleStatus } from "./types/ModuleStatus";
import { Jobs, Modules } from "./types/TestModules";

type ModuleClass<Module extends typeof BaseModule> = {
	// eslint-disable-next-line
	new (moduleManager: ModuleManager): Module;
};

export default class ModuleManager {
	private modules: Modules | null;

	private jobQueue: JobQueue;

	/**
	 * Module Manager
	 *
	 */
	public constructor() {
		this.modules = null;
		this.jobQueue = new JobQueue();
	}

	/**
	 * getStatus - Get status of modules
	 *
	 * @returns {object} Module statuses
	 */
	public getStatus() {
		if (!this.modules) return {};

		const status: Record<string, ModuleStatus> = {};

		Object.entries(this.modules).forEach(([name, module]) => {
			status[name] = module.getStatus();
		});

		return status;
	}

	/**
	 * getJobsStats - Get statistics of job queue
	 *
	 * @returns {object} Job queue statistics
	 */
	public getJobsStats() {
		return this.jobQueue.getStats();
	}

	/**
	 * getJobsStatus - Get status of job queue
	 *
	 * @returns {object} Job queue status
	 */
	public getJobsStatus() {
		return this.jobQueue.getStatus();
	}

	/**
	 * getQueueStatus - Get status of queued jobs
	 *
	 * @returns {object} Job statuses
	 */
	public getQueueStatus() {
		return this.jobQueue.getQueueStatus();
	}

	/**
	 *
	 * @param {string} moduleName Name of the module
	 * @returns {typeof BaseModule} Module
	 */
	private getModule<T extends keyof Modules>(
		moduleName: T
	): Promise<Modules[T]> {
		return new Promise(resolve => {
			const mapper = {
				stations: "StationModule",
				others: "OtherModule"
			};
			import(`./modules/${mapper[moduleName]}`).then(response => {
				const Module: ModuleClass<Modules[T]> = response.default;
				const module = new Module(this);
				resolve(module);
			});
		});
	}

	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns {Promise} Promise
	 */
	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns {Promise} Promise
	 */
	private loadModules(): Promise<void> {
		return new Promise((resolve, reject) => {
			const fetchModules = async () => ({
				stations: await this.getModule("stations"),
				others: await this.getModule("others")
			});
			fetchModules()
				.then(modules => {
					this.modules = modules;
					resolve();
				})
				.catch(err => {
					reject(new Error(err));
				});
		});
	}

	/**
	 * startup - Handle startup
	 */
	public startup(): void {
		this.loadModules()
			.then(() => {
				if (!this.modules) return;
				Object.values(this.modules).forEach(module => module.startup());
				this.jobQueue.resume();
			})
			.catch(() => this.shutdown());
	}

	/**
	 * shutdown - Handle shutdown
	 */
	public shutdown(): void {
		if (!this.modules) return;
		console.log(this.modules);
		Object.values(this.modules).forEach(module => module.shutdown());
	}

	/**
	 * runJob - Run a job
	 *
	 * @param {string} moduleName Module name
	 * @param {string} jobName Job name
	 * @param {[ any, { priority?: number }? ]} params Params
	 */
	public runJob<
		ModuleName extends keyof Jobs & keyof Modules,
		JobName extends keyof Jobs[ModuleName] &
			keyof Omit<Modules[ModuleName], keyof BaseModule>,
		Payload extends "payload" extends keyof Jobs[ModuleName][JobName]
			? Jobs[ModuleName][JobName]["payload"]
			: undefined,
		ReturnType = "returns" extends keyof Jobs[ModuleName][JobName]
			? Jobs[ModuleName][JobName]["returns"]
			: never
	>(
		moduleName: ModuleName,
		jobName: JobName,
		...params: Payload extends undefined
			? []
			: [Payload, { priority?: number }?]
	): Promise<ReturnType> {
		const [payload, options] = params;
		return new Promise<ReturnType>((resolve, reject) => {
			if (!this.modules) return;
			const module = this.modules[moduleName];
			if (!module) reject(new Error("Module not found."));
			else {
				const jobFunction = module[jobName];
				if (!jobFunction || typeof jobFunction !== "function")
					reject(new Error("Job function not found."));
				else if (
					Object.prototype.hasOwnProperty.call(BaseModule, jobName)
				)
					reject(new Error("Illegal job function."));
				else {
					this.jobQueue.add(
						new Job(
							jobName.toString(),
							moduleName,
							async (resolveJob, rejectJob) => {
								jobFunction(payload)
									.then((response: ReturnType) => {
										resolveJob();
										resolve(response);
									})
									.catch(() => {
										rejectJob();
										reject();
									});
							},
							{
								priority: (options && options.priority) || 10
							}
						)
					);
				}
			}
		});
	}
}
