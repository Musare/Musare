import BaseModule from "./BaseModule";
import Job from "./Job";
import JobContext from "./JobContext";
import JobStatistics from "./JobStatistics";
import LogBook from "./LogBook";
import ModuleManager from "./ModuleManager";
import { JobOptions } from "./types/JobOptions";
import { JobStatus } from "./types/JobStatus";
import { Jobs, Modules } from "./types/Modules";

export default class JobQueue {
	private concurrency: number;

	private isPaused: boolean;

	private jobs: Job[];

	private queue: Job[];

	private active: Job[];

	private processLock: boolean;

	private moduleManager: ModuleManager;

	private logBook: LogBook;

	private jobStatistics: JobStatistics;

	/**
	 * Job Queue
	 */
	public constructor(moduleManager: ModuleManager | null = null) {
		this.concurrency = 1;
		this.isPaused = true;
		this.jobs = [];
		this.queue = [];
		this.active = [];
		this.processLock = false;
		this.moduleManager =
			moduleManager ?? ModuleManager.getPrimaryInstance();
		this.logBook = LogBook.getPrimaryInstance();
		this.jobStatistics = JobStatistics.getPrimaryInstance();
	}

	/**
	 * add - Add job to queue
	 *
	 * @param job - Job
	 */
	public add(job: Job, runDirectly: boolean) {
		this.jobStatistics.updateStats(job.getName(), "added");
		this.jobs.push(job);
		if (runDirectly) {
			this.executeJob(job);
		} else {
			this.queue.push(job);
			setTimeout(() => {
				this.process();
			}, 0);
		}
	}

	/**
	 * getJob - Fetch job
	 *
	 * @param jobId - Job UUID
	 * @returns Job if found
	 */
	public getJob(jobId: string, recursive = false) {
		let job = this.jobs.find(job => job.getUuid() === jobId);
		if (job || !recursive) return job;

		this.jobs.some(currentJob => {
			job = currentJob.getJobQueue().getJob(jobId, recursive);
			return !!job;
		});

		return job;
	}

	/**
	 * pause - Pause queue
	 *
	 * Pause processing of jobs in queue, active jobs will not be paused.
	 */
	public pause() {
		this.isPaused = true;
	}

	/**
	 * resume - Resume queue
	 */
	public resume() {
		this.isPaused = false;
		this.process();
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
		return new Promise((resolve, reject) => {
			const module = this.moduleManager.getModule(
				moduleName
			) as Modules[ModuleNameType];
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
					const job = new Job(
						jobName.toString(),
						module,
						(job, resolveJob, rejectJob) => {
							const jobContext = new JobContext(job);
							jobFunction
								.apply(module, [jobContext, payload])
								.then((response: ReturnType) => {
									this.logBook.log({
										message: "Job completed successfully",
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
					);

					const runDirectly = !!(options && options.runDirectly);

					this.add(job, runDirectly);
				}
			}
		});
	}

	/**
	 * Actually run a job function
	 *
	 * @param job - Initiated job
	 */
	public executeJob(job: Job) {
		// Record when we started a job
		const startTime = Date.now();
		this.active.push(job);

		job.execute()
			.then(() => {
				this.jobStatistics.updateStats(job.getName(), "successful");
			})
			.catch(() => {
				this.jobStatistics.updateStats(job.getName(), "failed");
			})
			.finally(() => {
				this.jobStatistics.updateStats(job.getName(), "total");
				this.jobStatistics.updateStats(
					job.getName(),
					"averageTime",
					Date.now() - startTime
				);

				// If the current job is in the active jobs array, remove it, and then run the process function to run another job
				const activeJobIndex = this.active.indexOf(job);
				if (activeJobIndex > -1) {
					this.active.splice(activeJobIndex, 1);
					setTimeout(() => {
						this.process();
					}, 0);
				}
			});
	}

	/**
	 * process - Process queue
	 */
	private process() {
		// If the process is locked, don't continue. This prevents running process at the same time which could lead to issues
		if (this.processLock) return;
		// If the queue is paused, we've reached the maximum number of active jobs, or there are no jobs in the queue, don't continue
		if (
			this.isPaused ||
			this.active.length >= this.concurrency ||
			this.queue.length === 0
		)
			return;

		// Lock the process function
		this.processLock = true;

		// Sort jobs based on priority, with a lower priority being preferred
		const jobs = this.queue.sort(
			(a, b) => a.getPriority() - b.getPriority()
		);

		// Loop through all jobs
		for (let i = 0; i < jobs.length; i += 1) {
			const job = jobs[i];

			// If the module of the job is not started, we can't run the job, so go to the next job in the queue
			// eslint-disable-next-line no-continue
			if (job.getModule().getStatus() !== "STARTED") continue;

			// Remove the job from the queue and add it to the active jobs array
			this.queue.splice(this.queue.indexOf(job), 1);

			// Execute the job
			this.executeJob(job);

			// Stop the for loop
			break;
		}

		// Unlock the process after the for loop is finished, so it can be run again
		this.processLock = false;
	}

	/**
	 * getStatus - Get status of job queue
	 *
	 * @returns Job queue status
	 */
	public getStatus() {
		return {
			isPaused: this.isPaused,
			queueLength: this.queue.length,
			activeLength: this.active.length,
			concurrency: this.concurrency
		};
	}

	/**
	 * getQueueStatus - Get statistics of queued or active jobs
	 *
	 * @param type - Job type filter
	 * @returns Job queue statistics
	 */
	public getQueueStatus(type?: JobStatus) {
		const status: Record<
			string,
			{
				uuid: string;
				priority: number;
				name: string;
				status: JobStatus;
			}[]
		> = {};
		const format = (job: Job) => ({
			uuid: job.getUuid(),
			priority: job.getPriority(),
			name: job.getName(),
			status: job.getStatus()
		});
		if (!type || type === "ACTIVE") status.active = this.active.map(format);
		if (!type || type === "QUEUED") status.queue = this.queue.map(format);
		return status;
	}

	/**
	 * Gets the job array
	 *
	 */
	public getJobs() {
		return this.jobs;
	}
}
