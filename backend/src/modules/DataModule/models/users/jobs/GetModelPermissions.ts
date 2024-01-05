import { Types } from "mongoose";
import CacheModule from "@/modules/CacheModule";
import DataModule from "@/modules/DataModule";
import { Models, Models } from "@/types/Models";
import ModuleManager from "@/ModuleManager";
import GetPermissions from "./GetPermissions";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export default class GetModelPermissions extends DataModuleJob {
	protected static _modelName: keyof Models = "users";

	protected override async _authorize() {}

	protected async _execute({
		modelName,
		modelId
	}: {
		modelName: keyof Models;
		modelId?: Types.ObjectId;
	}) {
		const user = await this._context.getUser().catch(() => null);
		const permissions = await this._context.executeJob(GetPermissions);

		let cacheKey = `model-permissions.${modelName}`;

		if (modelId) cacheKey += `.${modelId}`;

		if (user) cacheKey += `.user.${user._id}`;
		else cacheKey += `.guest`;

		const cached = await CacheModule.get(cacheKey);

		if (cached) return cached;

		const Model = await DataModule.getModel(modelName);

		if (!Model) throw new Error("Model not found");

		const model = modelId ? await Model.findById(modelId) : null;

		if (modelId && !model) throw new Error("Model not found");

		const jobs = await Promise.all(
			Object.entries(ModuleManager.getModule("data")?.getJobs() ?? {})
				.filter(
					([jobName]) =>
						jobName.startsWith(modelName.toString()) &&
						(modelId ? true : !jobName.endsWith("ById"))
				)
				.map(async ([jobName, Job]) => {
					jobName = `data.${jobName}`;

					let hasPermission = permissions[jobName];

					if (!hasPermission && modelId)
						hasPermission =
							permissions[`${jobName}.*`] ||
							permissions[`${jobName}.${modelId}`];

					if (hasPermission) return [jobName, true];

					if (typeof Job.hasPermission === "function") {
						hasPermission = await Job.hasPermission(model, user);
					}

					return [jobName, !!hasPermission];
				})
		);

		const modelPermissions = Object.fromEntries(jobs);

		await CacheModule.set(cacheKey, modelPermissions, 360);

		return modelPermissions;
	}
}
