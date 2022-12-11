import { Jobs, Modules } from "./types/Modules";

import Job from "./Job";
import LogBook, { Log } from "./LogBook";
import ModuleManager from "./ModuleManager";
import BaseModule from "./BaseModule";
import { JobOptions } from "./types/JobOptions";

export default class JobContext {
	protected moduleManager: ModuleManager;

	protected logBook: LogBook;

	protected job: Job;

	public constructor(job: Job) {
		this.moduleManager = ModuleManager.getPrimaryInstance();
		this.logBook = LogBook.getPrimaryInstance();
		this.job = job;
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
			category: `${this.job.getModule().getName()}.${this.job.getName()}`,
			data: {
				moduleName: this.job.getModule().getName(),
				jobName: this.job.getName(),
				...data
			}
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
		return this.job.runJob(moduleName, jobName, payload, options);
	}
}
