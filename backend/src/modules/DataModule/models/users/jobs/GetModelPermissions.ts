import { isObjectIdOrHexString } from "mongoose";
import { forEachIn } from "@common/utils/forEachIn";
import CacheModule from "@/modules/CacheModule";
import DataModule from "@/modules/DataModule";
import ModuleManager from "@/ModuleManager";
import GetPermissions, { GetPermissionsResult } from "./GetPermissions";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export type GetModelPermissionsResult =
	| Record<string, boolean>
	| Record<string, Record<string, boolean>>;

export default class GetModelPermissions extends DataModuleJob {
	protected static _modelName = "users";

	protected static _hasPermission = true;

	protected override async _validate() {
		if (typeof this._payload !== "object" || this._payload === null)
			throw new Error("Payload must be an object");

		if (typeof this._payload.modelName !== "string")
			throw new Error("Model name must be a string");

		if (
			!isObjectIdOrHexString(this._payload.modelId) &&
			typeof this._payload.modelId !== "undefined" &&
			this._payload.modelId !== null
		)
			throw new Error("Model Id must be an ObjectId or undefined");
	}

	protected override async _authorize() {}

	protected async _execute(): Promise<GetModelPermissionsResult> {
		const { modelName, modelId, modelIds } = this._payload;

		const user = await this._context.getUser().catch(() => null);
		const permissions = (await this._context.executeJob(
			GetPermissions
		)) as GetPermissionsResult;

		const Model = await DataModule.getModel(modelName);
		if (!Model) throw new Error("Model not found");

		if (!modelId && (!modelIds || modelIds.length === 0)) {
			const cacheKey = this._getCacheKey(user, modelName);
			const cached = await CacheModule.get(cacheKey);
			if (cached) return cached;

			const modelPermissions = await this._getPermissionsForModel(
				user,
				permissions,
				modelName,
				modelId
			);

			await CacheModule.set(cacheKey, modelPermissions, 360);

			return modelPermissions;
		}

		if (modelId) {
			const cacheKey = this._getCacheKey(user, modelName, modelId);
			const cached = await CacheModule.get(cacheKey);
			if (cached) return cached;

			const model = await Model.findById(modelId);
			if (!model) throw new Error("Model not found");

			const modelPermissions = await this._getPermissionsForModel(
				user,
				permissions,
				modelName,
				modelId,
				model
			);

			await CacheModule.set(cacheKey, modelPermissions, 360);

			return modelPermissions;
		}

		const result: any = {};
		const uncachedModelIds: any = [];

		await forEachIn(modelIds, async modelId => {
			const cacheKey = this._getCacheKey(user, modelName, modelId);
			const cached = await CacheModule.get(cacheKey);
			if (cached) {
				result[modelId] = cached;
				return;
			}
			uncachedModelIds.push(modelId);
		});

		const uncachedModels = await Model.find({ _id: uncachedModelIds });

		await forEachIn(uncachedModelIds, async modelId => {
			const model = uncachedModels.find(
				model => model._id.toString() === modelId.toString()
			);
			if (!model) throw new Error(`No model found for ${modelId}.`);

			const modelPermissions = await this._getPermissionsForModel(
				user,
				permissions,
				modelName,
				modelId,
				model
			);

			const cacheKey = this._getCacheKey(user, modelName, modelId);
			await CacheModule.set(cacheKey, modelPermissions, 360);

			result[modelId] = modelPermissions;
		});

		return result;
	}

	protected async _getPermissionsForModel(
		user: any,
		permissions: GetPermissionsResult,
		modelName: string,
		modelId: string,
		model?: any
	) {
		const modelPermissions = Object.fromEntries(
			Object.entries(permissions).filter(
				([permission]) =>
					permission.startsWith(`data.${modelName}.`) ||
					permission.startsWith(`event.data.${modelName}.`)
			)
		);

		await forEachIn(
			Object.entries(
				ModuleManager.getModule("data")?.getJobs() ?? {}
			).filter(
				([jobName]) =>
					jobName.startsWith(modelName.toString()) &&
					(modelId ? true : !jobName.endsWith("ById"))
			) as [string, typeof DataModuleJob][],
			async ([jobName, Job]) => {
				jobName = `data.${jobName}`;

				let hasPermission = permissions[jobName];

				if (!hasPermission && modelId)
					hasPermission =
						permissions[`${jobName}.*`] ||
						permissions[`${jobName}.${modelId}`];

				if (hasPermission) {
					modelPermissions[jobName] = true;

					return;
				}

				if (typeof Job.hasPermission === "function") {
					hasPermission = await Job.hasPermission(model, user);
				}

				modelPermissions[jobName] = !!hasPermission;
			}
		);

		return modelPermissions;
	}

	protected _getCacheKey(user: any, modelName: string, modelId?: string) {
		let cacheKey = `model-permissions.${modelName}`;
		if (modelId) cacheKey += `.${modelId}`;
		if (user) cacheKey += `.user.${user._id}`;
		else cacheKey += `.guest`;
		return cacheKey;
	}
}
