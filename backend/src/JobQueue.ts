import Job from "./Job";
import { JobStatus } from "./types/JobStatus";

export default class JobQueue {
	private concurrency: number;

	private isPaused: boolean;

	private queue: Job[];

	private active: Job[];

	private stats: Record<
		string,
		{
			successful: number;
			failed: number;
			total: number;
			added: number;
			averageTime: number;
		}
	>;

	private processLock: boolean;

	/**
	 * Job Queue
	 */
	public constructor() {
		this.concurrency = 1;
		this.isPaused = true;
		this.queue = [];
		this.active = [];
		this.stats = {};
		this.processLock = false;
	}

	/**
	 * add - Add job to queue
	 *
	 * @param job - Job
	 */
	public add(job: Job): void {
		this.queue.push(job);
		this.updateStats(job.getName(), "added");
		setTimeout(() => {
			this.process();
		}, 0);
	}

	/**
	 * getJob - Fetch job
	 *
	 * @param jobId - Job UUID
	 * @returns Job if found
	 */
	public getJob(jobId: string): Job | undefined {
		return (
			this.queue.find(job => job.getUuid() === jobId) ||
			this.active.find(job => job.getUuid() === jobId)
		);
	}

	/**
	 * pause - Pause queue
	 *
	 * Pause processing of jobs in queue, active jobs will not be paused.
	 */
	public pause(): void {
		this.isPaused = true;
	}

	/**
	 * resume - Resume queue
	 */
	public resume(): void {
		this.isPaused = false;
	}

	/**
	 * Actually run a job function
	 *
	 * @param {Job} job
	 * @memberof JobQueue
	 */
	public runJob(job: Job) {
		// Record when we started a job
		const startTime = Date.now();

		job.execute()
			.then(() => {
				this.updateStats(job.getName(), "successful");
			})
			.catch(() => {
				this.updateStats(job.getName(), "failed");
			})
			.finally(() => {
				this.updateStats(job.getName(), "total");
				this.updateStats(
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
	private process(): void {
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
			this.active.push(job);

			// Run the job
			this.runJob(job);

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
	 * getStats - Get statistics of job queue
	 *
	 * @returns Job queue statistics
	 */
	public getStats() {
		return {
			...this.stats,
			total: Object.values(this.stats).reduce(
				(a, b) => ({
					successful: a.successful + b.successful,
					failed: a.failed + b.failed,
					total: a.total + b.total,
					added: a.added + b.added,
					averageTime: -1
				}),
				{
					successful: 0,
					failed: 0,
					total: 0,
					added: 0,
					averageTime: -1
				}
			)
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
	 * updateStats - Update job statistics
	 *
	 * @param jobName - Job name
	 * @param type - Stats type
	 */
	private updateStats(
		jobName: string,
		type: "successful" | "failed" | "total" | "added" | "averageTime",
		duration?: number
	) {
		if (!this.stats[jobName])
			this.stats[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				added: 0,
				averageTime: 0
			};
		if (type === "averageTime" && duration)
			this.stats[jobName].averageTime +=
				(duration - this.stats[jobName].averageTime) /
				this.stats[jobName].total;
		else this.stats[jobName][type] += 1;
	}
}
