import async from "async";
import BaseModule from "./BaseModule";
import Job from "./Job";
import JobQueue from "./JobQueue";
import LogBook from "./LogBook";
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
		this.jobQueue = new JobQueue();
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
	 * loadModule - Load and initialize module
	 *
	 * @param moduleName - Name of the module
	 * @returns Module
	 */
	private loadModule<T extends keyof Modules>(
		moduleName: T
	): Promise<Modules[T]> {
		return new Promise(resolve => {
			const mapper = {
				stations: "StationModule",
				others: "OtherModule",
				data: "DataModule"
			};
			import(`./modules/${mapper[moduleName]}`).then(
				({ default: Module }: { default: ModuleClass<Modules[T]> }) => {
					const module = new Module(this);
					resolve(module);
				}
			);
		});
	}

	/**
	 * loadModules - Load and initialize all modules
	 *
	 * @returns Promise
	 */
	private loadModules(): Promise<void> {
		return new Promise((resolve, reject) => {
			const fetchModules = async () => ({
				data: await this.loadModule("data"),
				others: await this.loadModule("others"),
				stations: await this.loadModule("stations")
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
				if (!this.modules) throw new Error("No modules were loaded");
				async.each(
					Object.values(this.modules),
					(module, next) => {
						module
							.startup()
							.then(() => next())
							.catch(err => {
								module.setStatus("ERROR");
								next(err);
							});
					},
					async err => {
						if (err) {
							await this.shutdown();
							throw err;
						}
						this.jobQueue.resume();
					}
				);
			})
			.catch(async err => {
				await this.shutdown();
				throw err;
			});
	}

	/**
	 * shutdown - Handle shutdown
	 */
	public shutdown(): Promise<void> {
		return new Promise((resolve, reject) => {
			// TODO: await jobQueue completion/handle shutdown
			if (this.modules)
				async.each(
					Object.values(this.modules),
					(module, next) => {
						if (
							module.getStatus() === "STARTED" ||
							module.getStatus() === "STARTING" || // TODO: Handle better
							module.getStatus() === "ERROR"
						)
							module
								.shutdown()
								.then(() => next())
								.catch(next);
					},
					err => {
						if (err) reject(err);
						else resolve();
					}
				);
			else resolve();
		});
	}

	/**
	 * runJob - Run a job
	 *
	 * @param moduleName - Module name
	 * @param jobName - Job name
	 * @param params - Params
	 */
	public runJob<
		M extends keyof Jobs & keyof Modules,
		J extends keyof Jobs[M] & keyof Omit<Modules[M], keyof BaseModule>,
		P extends "payload" extends keyof Jobs[M][J]
			? Jobs[M][J]["payload"]
			: undefined,
		R = "returns" extends keyof Jobs[M][J] ? Jobs[M][J]["returns"] : never
	>(
		moduleName: M,
		jobName: J,
		...params: P extends undefined ? [] : [P, { priority?: number }?]
	): Promise<R> {
		const [payload, options] = params;
		return new Promise<R>((resolve, reject) => {
			const module = this.modules && this.modules[moduleName];
			if (!module) reject(new Error("Module not found."));
			else {
				const jobFunction = module[jobName];
				if (!jobFunction || typeof jobFunction !== "function")
					reject(new Error("Job not found."));
				else if (
					Object.prototype.hasOwnProperty.call(BaseModule, jobName)
				)
					reject(new Error("Illegal job function."));
				else {
					this.jobQueue.add(
						new Job(
							jobName.toString(),
							moduleName,
							(job, resolveJob, rejectJob) => {
								jobFunction
									.apply(module, [payload])
									.then((response: R) => {
										this.logBook.log({
											message:
												"Job completed successfully",
											type: "success",
											category: "jobs",
											data: {
												jobName: job.getName(),
												jobId: job.getUuid()
											}
										});
										resolveJob();
										resolve(response);
									})
									.catch((err: any) => {
										this.logBook.log({
											message: `Job failed with error "${err}"`,
											type: "error",
											category: "jobs",
											data: {
												jobName: job.getName(),
												jobId: job.getUuid()
											}
										});
										rejectJob();
										reject(err);
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
