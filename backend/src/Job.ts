import BaseModule from "./BaseModule";
import JobContext from "./JobContext";
import JobStatistics from "./JobStatistics";
import LogBook, { Log } from "./LogBook";
import ModuleManager from "./ModuleManager";
import { JobOptions } from "./types/JobOptions";
import { Modules } from "./types/Modules";

export enum JobStatus {
	QUEUED = "QUEUED",
	ACTIVE = "ACTIVE",
	PAUSED = "PAUSED",
	COMPLETED = "COMPLETED"
}

export default class Job {
	protected name: string;

	protected module: Modules[keyof Modules];

	protected jobFunction: any;

	protected payload: any;

	protected context: JobContext;

	protected priority: number;

	protected longJob?: {
		title: string;
		progress?: {
			data: unknown;
			time: Date;
			timeout?: NodeJS.Timeout;
		};
	};

	protected uuid: string;

	protected status: JobStatus;

	protected createdAt: number;

	protected startedAt?: number;

	protected completedAt?: number;

	protected logBook: LogBook;

	protected jobStatistics: JobStatistics;

	/**
	 * Job
	 *
	 * @param name - Job name
	 * @param module - Job module
	 * @param callback - Job callback
	 * @param options - Job options
	 */
	public constructor(
		name: string,
		moduleName: keyof Modules,
		payload: any,
		options?: Omit<JobOptions, "runDirectly">
	) {
		this.name = name;
		this.priority = 1;

		const module = ModuleManager.getPrimaryInstance().getModule(moduleName);
		if (!module) throw new Error("Module not found.");
		this.module = module;

		// eslint-disable-next-line
		// @ts-ignore
		const jobFunction = this.module[this.name];
		if (!jobFunction || typeof jobFunction !== "function")
			throw new Error("Job not found.");
		if (Object.prototype.hasOwnProperty.call(BaseModule, this.name))
			throw new Error("Illegal job function.");
		this.jobFunction = jobFunction;

		this.payload = payload;

		this.logBook = LogBook.getPrimaryInstance();

		this.jobStatistics = JobStatistics.getPrimaryInstance();
		this.jobStatistics.updateStats(this.getName(), "added");

		let contextOptions;

		if (options) {
			const { priority, longJob, session, socketId } = options;

			if (session || socketId) contextOptions = { session, socketId };

			if (priority) this.priority = priority;

			if (longJob)
				this.longJob = {
					title: longJob
				};
		}

		this.context = new JobContext(this, contextOptions);

		/* eslint-disable no-bitwise, eqeqeq */
		this.uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
			/[xy]/g,
			c => {
				const r = (Math.random() * 16) | 0;
				const v = c == "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}
		);
		this.status = JobStatus.QUEUED;
		this.createdAt = Date.now();
	}

	/**
	 * getName - Get module and job name in a dot format, e.g. module.jobName
	 *
	 * @returns module.name
	 */
	public getName() {
		return `${this.module.getName()}.${this.name}`;
	}

	/**
	 * getPriority - Get job priority
	 *
	 * @returns priority
	 */
	public getPriority() {
		return this.priority;
	}

	/**
	 * getUuid - Get job UUID
	 *
	 * @returns UUID
	 */
	public getUuid() {
		return this.uuid;
	}

	/**
	 * getStatus - Get job status
	 *
	 * @returns status
	 */
	public getStatus() {
		return this.status;
	}

	/**
	 * setStatus - Set job status
	 *
	 * @param status - Job status
	 */
	protected setStatus(status: JobStatus) {
		this.status = status;
	}

	/**
	 * getModule - Get module
	 *
	 * @returns module
	 */
	public getModule() {
		return this.module;
	}

	/**
	 * execute - Execute job
	 *
	 * @returns Promise
	 */
	public async execute() {
		if (this.startedAt) throw new Error("Job has already been executed.");
		this.setStatus(JobStatus.ACTIVE);
		this.startedAt = Date.now();
		return (
			this.jobFunction
				.apply(this.module, [this.context, this.payload])
				// eslint-disable-next-line
				// @ts-ignore
				.then(response => {
					this.log({
						message: "Job completed successfully",
						type: "success"
					});
					this.jobStatistics.updateStats(
						this.getName(),
						"successful"
					);
					return response;
				})
				.catch((err: any) => {
					this.log({
						message: `Job failed with error "${err}"`,
						type: "error"
					});
					this.jobStatistics.updateStats(this.getName(), "failed");
					throw err;
				})
				.finally(() => {
					this.completedAt = Date.now();
					this.jobStatistics.updateStats(this.getName(), "total");
					if (this.startedAt)
						this.jobStatistics.updateStats(
							this.getName(),
							"averageTime",
							this.completedAt - this.startedAt
						);
					this.setStatus(JobStatus.COMPLETED);
				})
		);
	}

	/**
	 * Log a message in the context of the current job, which automatically sets the category and data
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
		this.logBook.log({
			message,
			type,
			category: this.getName(),
			data: {
				...this.toJSON(),
				...data
			}
		});
	}

	/**
	 * Serialize job info
	 *
	 * @returns json
	 */
	public toJSON() {
		return {
			uuid: this.getUuid(),
			priority: this.getPriority(),
			name: this.getName(),
			status: this.getStatus(),
			moduleStatus: this.module.getStatus(),
			createdAt: this.createdAt,
			startedAt: this.startedAt,
			completedAt: this.completedAt
		};
	}
}
