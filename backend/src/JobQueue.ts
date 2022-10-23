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
		}
	>;

	/**
	 * Job Queue
	 */
	public constructor() {
		this.concurrency = 10;
		this.isPaused = true;
		this.queue = [];
		this.active = [];
		this.stats = {};
	}

	/**
	 * add - Add job to queue
	 *
	 * @param {Job} job Job
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
	 * @param {jobId} jobId Job UUID
	 * @returns {Job|undefined} Job if found
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
	 * process - Process queue
	 */
	private process(): void {
		if (
			this.isPaused ||
			this.active.length >= this.concurrency ||
			this.queue.length === 0
		)
			return;

		const job = this.queue.reduce((a, b) =>
			a.getPriority() <= b.getPriority() ? a : b
		);
		if (job.getPriority() === -1) return;

		this.queue.splice(this.queue.indexOf(job), 1);
		this.active.push(job);

		job.execute()
			.then(() => {
				this.updateStats(job.getName(), "successful");
			})
			.catch(() => {
				this.updateStats(job.getName(), "failed");
			})
			.finally(() => {
				this.updateStats(job.getName(), "total");
				this.active.splice(this.active.indexOf(job), 1);
				setTimeout(() => {
					this.process();
				}, 0);
			});
	}

	/**
	 * getStatus - Get status of job queue
	 *
	 * @returns {object} Job queue status
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
	 * @returns {object} Job queue statistics
	 */
	public getStats() {
		return {
			...this.stats,
			total: Object.values(this.stats).reduce((a, b) => ({
				successful: a.successful + b.successful,
				failed: a.failed + b.failed,
				total: a.total + b.total,
				added: a.added + b.added
			}))
		};
	}

	/**
	 * getQueueStatus - Get statistics of queued or active jobs
	 *
	 * @param {JobStatus|undefined} type Job type filter
	 * @returns {object} Job queue statistics
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
	 * @param {string} jobName Job name
	 * @param {"successful"|"failed"|"total"} type Stats type
	 */
	private updateStats(
		jobName: string,
		type: "successful" | "failed" | "total" | "added"
	) {
		if (!this.stats[jobName])
			this.stats[jobName] = {
				successful: 0,
				failed: 0,
				total: 0,
				added: 0
			};
		this.stats[jobName][type] += 1;
	}
}
