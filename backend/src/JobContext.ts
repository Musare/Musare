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

	private _session?: SessionSchema;

	private readonly _socketId?: string;

	private _user?: UserSchema;

	private _permissions?: Record<string, boolean>;

	public constructor(
		job: Job,
		options?: { session?: SessionSchema; socketId?: string }
	) {
		this.job = job;
		this.jobQueue = JobQueue.getPrimaryInstance();
		this._session = options?.session;
		this._socketId = options?.socketId;
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
		return this._session;
	}

	public setSession(session?: SessionSchema) {
		this._session = session;
	}

	public getSocketId() {
		return this._socketId;
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
			session: this._session,
			socketId: this._socketId,
			...(options ?? {})
		}).execute();
	}

	public async getModel(model: keyof Models) {
		return this.executeJob("data", "getModel", model);
	}

	public async getUser(refresh = false) {
		if (!this._session?.userId)
			throw new Error("No user found for session");

		if (this._user && !refresh) return this._user;

		const User = await this.getModel("user");

		this._user = await User.findById(this._session.userId);

		if (!this._user) throw new Error("No user found for session");

		return this._user;
	}

	public async assertLoggedIn() {
		if (!this._session?.userId)
			throw new Error("No user found for session");
	}

	public async getUserPermissions(
		scope?: { stationId?: Types.ObjectId },
		refresh = false
	) {
		if (this._permissions && !refresh) return this._permissions;

		this._permissions = await this.executeJob(
			"api",
			"getUserPermissions",
			scope ?? {}
		);

		return this._permissions;
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
