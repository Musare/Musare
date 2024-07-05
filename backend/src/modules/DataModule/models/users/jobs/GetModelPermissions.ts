import { isObjectIdOrHexString } from "mongoose";
import { forEachIn } from "@common/utils/forEachIn";
import CacheModule from "@/modules/CacheModule";
import DataModule from "@/modules/DataModule";
import GetPermissions, { GetPermissionsResult } from "./GetPermissions";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import DataModuleEvent from "@/modules/DataModule/DataModuleEvent";
import { EventClass } from "@/modules/EventsModule/Event";

export type GetSingleModelPermissionsResult = Record<string, boolean>; // Returned when getting permissions for a single modelId
export type GetMultipleModelPermissionsResult = Record<
	string,
	Record<string, boolean>
>; // Returned when getting permissions for several modelIds
export type GetModelPermissionsResult =
	| GetSingleModelPermissionsResult
	| GetMultipleModelPermissionsResult; // TODO We should probably combine this into a single type of response to make it simpler

/**
 * Returns permissions for zero, one or more modelIds, for a single modelName, for a specific user
 * For each modelId, it will return an object with permissions, where object keys are the DataModule job names in camelCase,
 * prefixed by "data.", and the value is whether the user has permission or not
 * For events, it will be DataModule event names in camelCase, prefixed by "event.data."
 *
 * If no modelId is provided, it will not include jobs that apply specifically to a single modelId (those ending in ById)
 */
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
		// Gets the generic permissions for the current user, these are not model-specific
		const permissions = (await this._context.executeJob(
			GetPermissions
		)) as GetPermissionsResult;

		const Model = await DataModule.getModel(modelName);
		if (!Model) throw new Error("Model not found");

		// If no modelId is supplied, we want to return generic permissions for the provided model for the current user
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

		// For a single modelId, we want to return the permissions for that model for the current user
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

		// Go through the modelIds, check if any of them already have cached permissions. If they do, use those. For the rest, collect the id's
		await forEachIn(modelIds, async modelId => {
			const cacheKey = this._getCacheKey(user, modelName, modelId);
			const cached = await CacheModule.get(cacheKey);
			if (cached) {
				result[modelId] = cached;
				return;
			}
			uncachedModelIds.push(modelId);
		});

		// For the modelIds that were not cached, get the documents from MongoDB
		const uncachedModels = await Model.find({ _id: uncachedModelIds });

		// Loop through the modelIds that were not cached, and get the permissions for each one individually
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

	/**
	 * Returns the permissions for the provided user, generic permissions, model and, if provided, the modelId
	 * It will first take the generic permissions, only including the data/event data permisisons for the provided modelName
	 * After that, it loops through all DataModule jobs for the provided modelName, and checks if the user has permission for that job
	 * If it does, it includes these job names in the result, along with the filtered generic permissions.
	 * One example: with modelName being news, it would get the news FindById job, which always results in "data.news.findById" being true
	 * due to _hasPermission being true in that class
	 * It will also loop through DataModule events in the same manner, except without the extra logic for findById
	 */
	protected async _getPermissionsForModel(
		user: any,
		permissions: GetPermissionsResult,
		modelName: string,
		modelId: string,
		model?: any
	) {
		// Filters the generic permissions, only returning the data or event data permissions for the provided model
		const modelPermissions = Object.fromEntries(
			Object.entries(permissions).filter(
				([permission]) =>
					permission.startsWith(`data.${modelName}.`) ||
					permission.startsWith(`event.data.${modelName}.`)
			)
		);

		/**
		 * Get all DataModule jobs for the provided model.
		 * If a modelId is specified, it will return any ById jobs, like DeleteById.
		 * If not specified, it will not return any *ById jobs.
		 */
		const dataModuleJobs = Object.entries(
			// ModuleManager.getModule("data")?.getJobs() ?? {}
			DataModule.getJobs() ?? {}
		).filter(
			([jobName]) =>
				jobName.startsWith(modelName.toString()) &&
				(modelId ? true : !jobName.endsWith("ById"))
		) as [string, typeof DataModuleJob][];

		// Loops through all data jobs
		await forEachIn(dataModuleJobs, async ([jobName, Job]) => {
			jobName = `data.${jobName}`; // For example, data.news.getData

			// If the generic permissions contains the current job, we don't need to continue further, just say the user has permission for this job
			if (permissions[jobName]) {
				modelPermissions[jobName] = true;
				return;
			}

			// If the generic permissions has access to for example "data.news.findManyById.*", the user will have permission to the job "data.news.findManyById"
			if (permissions[`${jobName}.*`]) {
				modelPermissions[jobName] = true;
				return;
			}

			/**
			 * If we haven't found a generic permission, but the current job has a hasPermission function, call that function to see if the current user
			 * should have permission for the provided model (document? TODO) (if any). The job, for example data.news.findManyById, will already be aware of the model name
			 * hasPermission can be overwritten, but by default it will check _hasPermission. This is false by default, but can be true, or a function or array of functions
			 */
			if (
				typeof Job.hasPermission === "function" &&
				(await Job.hasPermission(model, user))
			) {
				modelPermissions[jobName] = true;
				return;
			}

			// We haven't found permission so far, so we can assume we don't have permission
			modelPermissions[jobName] = false;
		});

		/**
		 * Get all DataModule events for the provided model.
		 */
		const dataModuleEvents = Object.entries(
			DataModule.getEvents() ?? {}
		).filter(([eventName]) =>
			eventName.startsWith(modelName.toString())
		) as [string, typeof DataModuleEvent & EventClass][];

		// Loops through all data events
		await forEachIn(dataModuleEvents, async ([eventName, Event]) => {
			eventName = `event.data.${eventName}`; // For example, event.data.news.created

			// If the generic permissions contains the current event, we don't need to continue further, just say the user has permission for this event
			if (permissions[eventName]) {
				modelPermissions[eventName] = true;
				return;
			}

			// If the generic permissions has access to for example "event.data.news.updated.*", the user will have permission to the event "event.data.news.updated" regardless of the model id
			if (permissions[`${eventName}.*`]) {
				modelPermissions[eventName] = true;
				return;
			}

			/**
			 * If we haven't found a generic permission, but the current event has a hasPermission function, call that function to see if the current user
			 * should have permission for the provided model (if any). The event, for example event.data.news.updated, will already be aware of the model name
			 * hasPermission can be overwritten, but by default it will check _hasPermission. This is false by default, but can be changed to true, or a function,
			 * or an array of functions
			 */
			if (
				typeof Event.hasPermission === "function" &&
				(await Event.hasPermission(model, user))
			) {
				modelPermissions[eventName] = true;
				return;
			}

			// We haven't found permission so far, so we can assume we don't have permission
			modelPermissions[eventName] = false;
		});

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
