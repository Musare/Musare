import { JobStatus } from "./types/JobStatus";

export default class Job {
	protected name: string;

	protected module: string;

	protected callback: (resolve: () => void, reject: () => void) => void;

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

	protected startedAt: number;

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
		module: string,
		callback: (resolve: () => void, reject: () => void) => void,
		options?: { priority: number; longJob?: string }
	) {
		this.name = name;
		this.module = module;
		this.callback = callback;
		this.priority = 1;

		if (options) {
			const { priority, longJob } = options;
			if (priority) this.priority = priority;
			if (longJob)
				this.longJob = {
					title: longJob
				};
		}

		/* eslint-disable no-bitwise, eqeqeq */
		this.uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
			/[xy]/g,
			c => {
				const r = (Math.random() * 16) | 0;
				const v = c == "x" ? r : (r & 0x3) | 0x8;
				return v.toString(16);
			}
		);
		this.status = "QUEUED";
		this.startedAt = Date.now();
	}

	/**
	 * getName - Get job name
	 *
	 * @returns module.name
	 */
	public getName(): string {
		return `${this.module}.${this.name}`;
	}

	/**
	 * getPriority - Get job priority
	 *
	 * @returns priority
	 */
	public getPriority(): number {
		return this.priority;
	}

	/**
	 * getUuid - Get job UUID
	 *
	 * @returns UUID
	 */
	public getUuid(): string {
		return this.uuid;
	}

	/**
	 * getStatus - Get job status
	 *
	 * @returns status
	 */
	public getStatus(): JobStatus {
		return this.status;
	}

	/**
	 * setStatus - Set job status
	 *
	 * @param status - Job status
	 */
	public setStatus(status: JobStatus): void {
		this.status = status;
	}

	/**
	 * execute - Execute job
	 *
	 * @returns Promise
	 */
	public execute(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.setStatus("ACTIVE");
			this.callback(resolve, reject);
		});
	}
}
