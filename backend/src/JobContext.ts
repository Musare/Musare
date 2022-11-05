import { Jobs, Modules } from "./types/Modules";

import Job from "./Job";
import LogBook from "./LogBook";
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
	 * @param {string} message
	 * @memberof JobContext
	 */
	public log(message: string) {
		this.moduleManager.logBook.log({
			message,
			category: `${this.job.getModule().getName()}.${this.job.getName()}`,
			data: {
				moduleName: this.job.getModule().getName(),
				jobName: this.job.getName()
			}
		});
	}

	/**
	 * Runs a job in the context of an existing job, which by default runs jobs right away
	 *
	 * @template ModuleNameType name of the module, which must exist
	 * @template JobNameType name of the job, which must exist
	 * @template PayloadType payload type based on the module and job, which is void if there is no payload
	 * @template ReturnType return type of the Promise, based on the module and job
	 * @param {ModuleNameType} moduleName
	 * @param {JobNameType} jobName
	 * @param {PayloadType} payload
	 * @param {JobOptions} [options]
	 * @return {*}  {Promise<ReturnType>}
	 * @memberof JobContext
	 */
	public runJob<
		ModuleNameType extends keyof Jobs & keyof Modules,
		JobNameType extends keyof Jobs[ModuleNameType] &
			keyof Omit<Modules[ModuleNameType], keyof BaseModule>,
		PayloadType extends "payload" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["payload"] extends undefined
				? void
				: Jobs[ModuleNameType][JobNameType]["payload"]
			: void,
		ReturnType = "returns" extends keyof Jobs[ModuleNameType][JobNameType]
			? Jobs[ModuleNameType][JobNameType]["returns"]
			: never
	>(
		moduleName: ModuleNameType,
		jobName: JobNameType,
		payload: PayloadType,
		options?: JobOptions
	): Promise<ReturnType> {
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
