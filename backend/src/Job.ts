import BaseModule from "./BaseModule";
import JobQueue from "./JobQueue";
import LogBook from "./LogBook";
import ModuleManager from "./ModuleManager";
import { JobOptions } from "./types/JobOptions";
import { JobStatus } from "./types/JobStatus";
import { Jobs, Module, Modules } from "./types/Modules";

export default class Job {
	protected name: string;

	protected module: Module;

	protected callback: (
		job: this,
		resolve: () => void,
		reject: () => void
	) => void;

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

	protected moduleManager: ModuleManager;

	protected logBook: LogBook;

	protected jobQueue: JobQueue;

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
		module: Module,
		callback: (job: Job, resolve: () => void, reject: () => void) => void,
		options: { priority: number; longJob?: string },
		moduleManager: ModuleManager,
		logBook: LogBook
	) {
		this.name = name;
		this.module = module;
		this.callback = callback;
		this.priority = 1;

		this.moduleManager = moduleManager;
		this.logBook = logBook;

		this.jobQueue = new JobQueue(moduleManager, logBook);

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
	public setStatus(status: JobStatus) {
		this.status = status;
		if (this.status === "ACTIVE") this.jobQueue.resume();
		else if (this.status === "PAUSED") this.jobQueue.pause();
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
	 * Gets the job queue for jobs running under this current job
	 */
	public getJobQueue() {
		return this.jobQueue;
	}

	/**
	 * execute - Execute job
	 *
	 * @returns Promise
	 */
	public execute(): Promise<void> {
		return new Promise((resolve, reject) => {
			this.setStatus("ACTIVE");
			this.callback(this, resolve, reject);
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
