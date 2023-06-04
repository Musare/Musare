import { Types } from "mongoose";
import BaseModule from "./BaseModule";
import Job from "./Job";
import JobQueue from "./JobQueue";
import { Log } from "./LogBook";
import { SessionSchema } from "./schemas/session";
import { JobOptions } from "./types/JobOptions";
import { Jobs, Modules } from "./types/Modules";
import { UserSchema } from "./schemas/user";
import { Models } from "./types/Models";

export default class JobContext {
	public readonly job: Job;

	public readonly jobQueue: JobQueue;

	private session?: SessionSchema;

	private user?: UserSchema;

	private permissions?: Record<string, boolean>;

	public constructor(job: Job, session?: SessionSchema) {
		this.job = job;
		this.jobQueue = JobQueue.getPrimaryInstance();
		this.session = session;
	}

	/**
	 * Log a message in the context of the current job, which automatically sets the category and data
	 *
	 * @param log - Log message or object
	 */
	public log(log: string | Omit<Log, "timestamp" | "category">) {
		return this.job.log(log);
	}

	public getSession() {
		return this.session;
	}

	public setSession(session?: SessionSchema) {
		this.session = session;
	}

	/**
	 * executeJob - Execute a job
	 *
	 * @param moduleName - Module name
	 * @param jobName - Job name
	 * @param params - Params
	 */
	public async executeJob<
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
		return new Job(jobName.toString(), moduleName, payload, {
			session: this.session,
			...(options ?? {})
		}).execute();
	}

	public async getModel(model: keyof Models) {
		return this.executeJob("data", "getModel", model);
	}

	public async getUser(refresh = false) {
		if (!this.session?.userId) throw new Error("No user found for session");

		if (this.user && !refresh) return this.user;

		const User = await this.getModel("user");

		this.user = await User.findById(this.session.userId);

		if (!this.user) throw new Error("No user found for session");

		return this.user;
	}

	public async assertLoggedIn() {
		if (!this.session?.userId) throw new Error("No user found for session");
	}

	public async getUserPermissions(
		scope?: { stationId?: Types.ObjectId },
		refresh = false
	) {
		if (this.permissions && !refresh) return this.permissions;

		this.permissions = await this.executeJob(
			"api",
			"getUserPermissions",
			scope ?? {}
		);

		return this.permissions;
	}

	public async assertPermission(
		permission: string,
		scope?: { stationId?: Types.ObjectId }
	) {
		const permissions = await this.getUserPermissions(scope);

		if (!permissions[permission])
			throw new Error("Insufficient permissions");
	}
}
