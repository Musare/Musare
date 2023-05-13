import BaseModule, { ModuleStatus } from "./BaseModule";
import Job, { JobStatus } from "./Job";
import { JobOptions } from "./types/JobOptions";
import { Jobs, Modules } from "./types/Modules";

export default class JobQueue {
	static primaryInstance = new this();

	private concurrency: number;

	private isPaused: boolean;

	private jobs: Job[];

	private queue: Job[];

	private active: Job[];

	private processLock: boolean;

	private callbacks: Record<
		string,
		{
			resolve: (value: any) => void;
			reject: (reason?: any) => void;
		}
	>;

	/**
	 * Job Queue
	 */
	public constructor() {
		this.concurrency = 10000;
		this.isPaused = true;
		this.jobs = [];
		this.queue = [];
		this.active = [];
		this.callbacks = {};
		this.processLock = false;
	}

	/**
	 * getJob - Fetch job
	 *
	 * @param jobId - Job UUID
	 * @returns Job if found
	 */
	public getJob(jobId: string) {
		return this.jobs.find(job => job.getUuid() === jobId);
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
	public async runJob<
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
		return new Promise<ReturnType>((resolve, reject) => {
			this.queueJob(
				moduleName,
				jobName,
				payload,
				{ resolve, reject },
				options
			);
		});
	}

	/**
	 * queueJob - Queue a job
	 *
	 * @param moduleName - Module name
	 * @param jobName - Job name
	 * @param params - Params
	 */
	public async queueJob<
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
		callback: {
			resolve: (value: ReturnType) => void;
			reject: (reason?: any) => void;
		},
		options?: JobOptions
	): Promise<string> {
		const job = new Job(jobName.toString(), moduleName, payload, options);

		this.callbacks[job.getUuid()] = callback;

		this.jobs.push(job);
		this.queue.push(job);
		this.process();

		return job.getUuid();
	}

	/**
	 * process - Process queue
	 */
	private async process() {
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
			if (job.getModule().getStatus() !== ModuleStatus.STARTED) continue;

			// Remove the job from the queue and add it to the active jobs array
			this.queue.splice(this.queue.indexOf(job), 1);

			// Execute the job
			this.active.push(job);

			const callback = this.callbacks[job.getUuid()];
			job.execute()
				.then(callback.resolve)
				.catch(callback.reject)
				.finally(() => {
					delete this.callbacks[job.getUuid()];

					// If the current job is in the active jobs array, remove it, and then run the process function to run another job
					const activeJobIndex = this.active.indexOf(job);
					if (activeJobIndex > -1) {
						this.active.splice(activeJobIndex, 1);
					}

					this.process();
				});
			// Stop the for loop
			if (this.active.length >= this.concurrency) break;
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
		const status: Record<string, ReturnType<Job["toJSON"]>[]> = {};
		if (!type || type === JobStatus.ACTIVE)
			status.active = this.active.map(job => job.toJSON());
		if (!type || type === JobStatus.QUEUED)
			status.queue = this.queue.map(job => job.toJSON());
		return status;
	}

	/**
	 * Gets the job array
	 *
	 */
	public getJobs() {
		return this.jobs;
	}

	static getPrimaryInstance(): JobQueue {
		return this.primaryInstance;
	}

	static setPrimaryInstance(instance: JobQueue) {
		this.primaryInstance = instance;
	}
}
