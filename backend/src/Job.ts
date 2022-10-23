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
	 * @param {string} name Job name
	 * @param {string} module Job module
	 * @param {Function} callback Job callback
	 * @param {object|undefined} options Job options
	 * @param {number|undefined} options.priority Job priority
	 * @param {string|undefined} options.longJob Long job title, providing makes job a long job
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
	 * @returns {string} module.name
	 */
	public getName(): string {
		return `${this.module}.${this.name}`;
	}

	/**
	 * getPriority - Get job priority
	 *
	 * @returns {number} priority
	 */
	public getPriority(): number {
		return this.priority;
	}

	/**
	 * getUuid - Get job UUID
	 *
	 * @returns {string} UUID
	 */
	public getUuid(): string {
		return this.uuid;
	}

	/**
	 * getStatus - Get job status
	 *
	 * @returns {JobStatus} status
	 */
	public getStatus(): JobStatus {
		return this.status;
	}

	/**
	 * setStatus - Set job status
	 *
	 * @param {JobStatus} status Job status
	 */
	public setStatus(status: JobStatus): void {
		this.status = status;
	}

	/**
	 * execute - Execute job
	 *
	 * @returns {Promise<void>} Promise
	 */
	public execute(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.setStatus("ACTIVE");
			this.callback(resolve, reject);
		});
	}
}
