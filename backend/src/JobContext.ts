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

	public constructor(
		moduleManager: ModuleManager,
		logBook: LogBook,
		job: Job
	) {
		this.moduleManager = moduleManager;
		this.logBook = logBook;
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
		this.moduleManager.logBook.log({
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
	 * Runs a job in the context of an existing job, which by default runs jobs right away
	 *
	 * @typeParam ModuleNameType - name of the module, which must exist
	 * @typeParam JobNameType - name of the job, which must exist
	 * @typeParam PayloadType - payload type based on the module and job, which is void if there is no payload
	 * @param moduleName - Module name
	 * @param jobName - Job name
	 * @param payload - Job payload, if none then void
	 * @param options - Job options
	 */
	public runJob<
		ModuleNameType extends keyof Jobs & keyof Modules,
		JobNameType extends keyof Jobs[ModuleNameType] &
			keyof Omit<Modules[ModuleNameType], keyof BaseModule>,
		PayloadType extends "payload" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["payload"] extends undefined
				? Record<string, never>
				: Jobs[ModuleNameType][JobNameType]["payload"]
			: Record<string, never>
	>(
		moduleName: ModuleNameType,
		jobName: JobNameType,
		payload: PayloadType,
		options?: JobOptions
	) {
		// If options doesn't exist, create it
		const newOptions = options ?? {};
		// If runDirectly is not set, set it to true
		if (!Object.hasOwn(newOptions, "runDirectly"))
			newOptions.runDirectly = true;

		// Ask module manager to run the provided job
		return this.moduleManager.runJob(
			moduleName,
			jobName,
			payload,
			newOptions
		);
	}
}
