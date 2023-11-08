import { Types } from "mongoose";
import { SessionSchema } from "@/models/schemas/sessions/schema";
import BaseModule from "@/BaseModule";
import Job from "@/Job";
import { Log } from "@/LogBook";
import { JobOptions } from "@/types/JobOptions";
import { Jobs, Modules } from "@/types/Modules";
import { Models } from "@/types/Models";
import DataModule from "@/modules/DataModule";

export default class JobContext {
	public readonly job: Job;

	private _session?: SessionSchema;

	private readonly _socketId?: string;

	private readonly _callbackRef?: string;

	public constructor(
		job: Job,
		options?: {
			session?: SessionSchema;
			socketId?: string;
			callbackRef?: string;
		}
	) {
		this.job = job;
		this._session = options?.session;
		this._socketId = options?.socketId;
		this._callbackRef = options?.callbackRef;
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

	public getCallbackRef() {
		return this._callbackRef;
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

	public async getUser() {
		if (!this._session?.userId)
			throw new Error("No user found for session");

		const User = await DataModule.getModel("users");

		const user = await User.findById(this._session.userId);

		if (!user) throw new Error("No user found for session");

		return user;
	}

	public async assertLoggedIn() {
		if (!this._session?.userId)
			throw new Error("No user found for session");
	}

	public async getUserPermissions() {
		return this.executeJob("api", "getUserPermissions", {});
	}

	public async getUserModelPermissions({
		modelName,
		modelId
	}: {
		modelName: keyof Models;
		modelId?: Types.ObjectId;
	}) {
		return this.executeJob("api", "getUserModelPermissions", {
			modelName,
			modelId
		});
	}

	public async assertPermission(permission: string) {
		let hasPermission = false;

		const [, moduleName, modelOrJobName, jobName, modelId] =
			/^([a-z]+)\.([a-z]+)\.([A-z]+)\.?([A-z0-9]+)?$/.exec(permission) ??
			[];

		if (moduleName === "data" && modelOrJobName && jobName) {
			const permissions = await this.getUserModelPermissions({
				modelName: modelOrJobName,
				modelId
			});

			hasPermission = permissions[`data.${modelOrJobName}.${jobName}`];
		} else {
			const permissions = await this.getUserPermissions();

			hasPermission = permissions[permission];
		}

		if (!hasPermission) throw new Error("Insufficient permissions");
	}
}
