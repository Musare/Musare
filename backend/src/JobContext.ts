import { forEachIn } from "@common/utils/forEachIn";
import { SessionSchema } from "@/modules/DataModule/models/sessions/schema";
import Job, { JobOptions } from "@/Job";
import { Log } from "@/LogBook";
import DataModule from "@/modules/DataModule";
import { UserModel } from "@/modules/DataModule/models/users/schema";
import { JobDerived } from "./types/JobDerived";
import assertJobDerived from "./utils/assertJobDerived";
import {
	GetMultipleModelPermissionsResult,
	GetSingleModelPermissionsResult
} from "./modules/DataModule/models/users/jobs/GetModelPermissions";
import { GetPermissionsResult } from "./modules/DataModule/models/users/jobs/GetPermissions";

const permissionRegex =
	// eslint-disable-next-line max-len
	/^(?<moduleName>[a-z]+)\.(?<modelOrJobName>[A-z]+)\.(?<jobName>[A-z]+)(?::(?:(?<modelId>[A-z0-9]{24})(?:\.(?<extraAfterModelId>[A-z]+))?|(?<extraAfterColon>[A-z]+)))?$/;

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

		const {
			moduleName,
			modelOrJobName,
			jobName,
			modelId,
			extraAfterModelId,
			extraAfterColon
		} = permissionRegex.exec(permission)?.groups ?? {};
		const extra = extraAfterModelId || extraAfterColon;

		if (moduleName === "data" && modelOrJobName && jobName) {
			const GetModelPermissions = DataModule.getJob(
				"users.getModelPermissions"
			);

			const permissions = (await this.executeJob(GetModelPermissions, {
				modelName: modelOrJobName,
				modelId
			})) as GetSingleModelPermissionsResult;

			let modelPermission = `data.${modelOrJobName}.${jobName}`;

			if (extra) modelPermission += `.${extra}`;

			hasPermission = permissions[modelPermission];
		} else {
			const GetPermissions = DataModule.getJob("users.getPermissions");

			const permissions = (await this.executeJob(
				GetPermissions
			)) as GetPermissionsResult;

			hasPermission = permissions[permission];
		}

		if (!hasPermission)
			throw new Error(
				`Insufficient permissions for permission ${permission}`
			);
	}

	public async assertPermissions(permissions: string[]) {
		const hasPermission: { [permission: string]: boolean } = {};
		permissions.forEach(permission => {
			hasPermission[permission] = false;
		});

		const permissionData = permissions.map(permission => {
			const {
				moduleName,
				modelOrJobName,
				jobName,
				modelId,
				extraAfterModelId,
				extraAfterColon
			} = permissionRegex.exec(permission)?.groups ?? {};
			const extra = extraAfterModelId || extraAfterColon;

			return {
				permission,
				moduleName,
				modelOrJobName,
				jobName,
				modelId,
				extra
			};
		});

		const dataPermissions = permissionData.filter(
			({ moduleName, modelOrJobName, jobName }) =>
				moduleName === "data" && modelOrJobName && jobName
		);
		const otherPermissions = permissionData.filter(
			({ moduleName, modelOrJobName, jobName }) =>
				!(moduleName === "data" && modelOrJobName && jobName)
		);

		if (otherPermissions.length > 0) {
			const GetPermissions = DataModule.getJob("users.getPermissions");

			const permissions = (await this.executeJob(
				GetPermissions
			)) as GetPermissionsResult;

			otherPermissions.forEach(({ permission }) => {
				hasPermission[permission] = permissions[permission];
			});
		}

		if (dataPermissions.length > 0) {
			const dataPermissionsPerModel: any = {};
			dataPermissions.forEach(dataPermission => {
				const { modelOrJobName } = dataPermission;
				if (!Array.isArray(dataPermissionsPerModel[modelOrJobName]))
					dataPermissionsPerModel[modelOrJobName] = [];
				dataPermissionsPerModel[modelOrJobName].push(dataPermission);
			});

			const modelNames = Object.keys(dataPermissionsPerModel);

			const GetModelPermissions = DataModule.getJob(
				"users.getModelPermissions"
			);

			await forEachIn(modelNames, async modelName => {
				const dataPermissionsForThisModel =
					dataPermissionsPerModel[modelName];
				const modelIds = dataPermissionsForThisModel.map(
					({ modelId }: { modelId: string }) => modelId
				);

				const permissions = (await this.executeJob(
					GetModelPermissions,
					{
						modelName,
						modelIds
					}
				)) as GetMultipleModelPermissionsResult;

				dataPermissionsForThisModel.forEach(
					({
						modelOrJobName,
						jobName,
						modelId,
						extra,
						permission
					}: {
						modelOrJobName: string;
						jobName: string;
						modelId: string;
						extra?: string;
						permission: string;
					}) => {
						let modelPermission = `data.${modelOrJobName}.${jobName}`;

						if (extra) modelPermission += `.${extra}`;

						const permissionsForModelId = permissions[
							modelId
						] as Record<string, boolean>;

						hasPermission[permission] =
							permissionsForModelId[modelPermission];
					}
				);
			});
		}

		if (
			Object.values(hasPermission).some(hasPermission => !hasPermission)
		) {
			const missingPermissions = Object.entries(hasPermission)
				.filter(([, hasPermission]) => !hasPermission)
				.map(([permission]) => permission);
			throw new Error(
				`Insufficient permissions for permission(s) ${missingPermissions.join(
					", "
				)}`
			);
		}
	}
}
