import { SessionSchema } from "@/modules/DataModule/models/sessions/schema";
import Job, { JobOptions } from "@/Job";
import { Log } from "@/LogBook";
import DataModule from "@/modules/DataModule";
import { UserModel } from "@/modules/DataModule/models/users/schema";
import { JobDerived } from "./types/JobDerived";
import assertJobDerived from "./utils/assertJobDerived";
import { GetModelPermissionsResult } from "./modules/DataModule/models/users/jobs/GetModelPermissions";
import { GetPermissionsResult } from "./modules/DataModule/models/users/jobs/GetPermissions";

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

	public executeJob(
		// eslint-disable-next-line @typescript-eslint/ban-types
		JobClass: Function,
		payload?: unknown,
		options?: JobOptions
	) {
		assertJobDerived(JobClass);

		return new (JobClass as JobDerived)(payload, {
			session: this._session,
			socketId: this._socketId,
			...(options ?? {})
		}).execute();
	}

	public async getUser() {
		if (!this._session?.userId)
			throw new Error("No user found for session");

		const User = await DataModule.getModel<UserModel>("users");

		const user = await User.findById(this._session.userId);

		if (!user) throw new Error("No user found for session");

		return user;
	}

	public async assertLoggedIn() {
		if (!this._session?.userId)
			throw new Error("No user found for session");
	}

	public async assertPermission(permission: string) {
		let hasPermission = false;

		const [, moduleName, modelOrJobName, jobName, modelId] =
			/^([a-z]+)\.([a-z]+)\.([A-z]+)\.?([A-z0-9]+)?$/.exec(permission) ??
			[];

		if (moduleName === "data" && modelOrJobName && jobName) {
			const GetModelPermissions = DataModule.getJob(
				"users.getModelPermissions"
			);

			const permissions = (await this.executeJob(GetModelPermissions, {
				modelName: modelOrJobName,
				modelId
			})) as GetModelPermissionsResult;

			hasPermission = permissions[`data.${modelOrJobName}.${jobName}`];
		} else {
			const GetPermissions = DataModule.getJob("users.getPermissions");

			const permissions = (await this.executeJob(
				GetPermissions
			)) as GetPermissionsResult;

			hasPermission = permissions[permission];
		}

		if (!hasPermission) throw new Error("Insufficient permissions");
	}
}
