import { Types } from "mongoose";
import { UserRole } from "@/models/schemas/users/UserRole";
import JobContext from "@/JobContext";
import BaseModule from "@/BaseModule";
import { UniqueMethods } from "@/types/Modules";
import permissions from "@/permissions";
import Job from "@/Job";
import { Models } from "@/types/Models";
import ModuleManager from "@/ModuleManager";
import JobQueue from "@/JobQueue";
import DataModule from "@/modules/DataModule";
import EventsModule from "./EventsModule";
import CacheModule from "./CacheModule";

export class APIModule extends BaseModule {
	private _subscriptions: Record<string, Set<string>>;

	/**
	 * API Module
	 */
	public constructor() {
		super("api");

		this._dependentModules = ["cache", "data", "events", "websocket"];

		this._subscriptions = {};
	}

	/**
	 * startup - Startup api module
	 */
	public override async startup() {
		await super.startup();

		await super._started();
	}

	/**
	 * shutdown - Shutdown api module
	 */
	public override async shutdown() {
		await super.shutdown();

		await this._removeAllSubscriptions();

		await super._stopped();
	}

	public async getUserPermissions(context: JobContext) {
		const user = await context.getUser().catch(() => null);

		if (!user) return permissions.guest;

		const cacheKey = `user-permissions.${user._id}`;

		const cached = await CacheModule.get(cacheKey);

		if (cached) return cached;

		const roles: UserRole[] = [user.role];

		let rolePermissions: Record<string, boolean> = {};
		roles.forEach(role => {
			if (permissions[role])
				rolePermissions = { ...rolePermissions, ...permissions[role] };
		});

		await CacheModule.set(cacheKey, rolePermissions, 360);

		return rolePermissions;
	}

	public async getUserModelPermissions(
		context: JobContext,
		{
			modelName,
			modelId
		}: { modelName: keyof Models; modelId?: Types.ObjectId }
	) {
		const user = await context.getUser().catch(() => null);
		const permissions = await context.getUserPermissions();

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
			Object.keys(ModuleManager.getModule("data")?.getJobs() ?? {})
				.filter(
					jobName =>
						jobName.startsWith(modelName.toString()) &&
						(modelId ? true : !jobName.endsWith("ById"))
				)
				.map(async jobName => {
					jobName = `data.${jobName}`;

					let hasPermission = permissions[jobName];

					if (!hasPermission && modelId)
						hasPermission =
							permissions[`${jobName}.*`] ||
							permissions[`${jobName}.${modelId}`];

					if (hasPermission) return [jobName, true];

					const [, shortJobName] =
						new RegExp(`^data.${modelName}.([A-z]+)`).exec(
							jobName
						) ?? [];

					const schemaOptions = (Model.schema.get("jobConfig") ?? {})[
						shortJobName
					];
					let options = schemaOptions?.hasPermission ?? [];

					if (!Array.isArray(options)) options = [options];

					hasPermission = await options.reduce(
						async (previous, option) => {
							if (await previous) return true;

							if (typeof option === "boolean") return option;

							if (typeof option === "function")
								return option(model, user);

							return false;
						},
						Promise.resolve(false)
					);

					return [jobName, !!hasPermission];
				})
		);

		const modelPermissions = Object.fromEntries(jobs);

		await CacheModule.set(cacheKey, modelPermissions, 360);

		return modelPermissions;
	}

	private async _subscriptionCallback(channel: string, value?: any) {
		const promises = [];
		for await (const socketId of this._subscriptions[channel].values()) {
			promises.push(
				JobQueue.runJob("websocket", "dispatch", {
					socketId,
					channel,
					value
				})
			);
		}
		await Promise.all(promises);
	}

	public async subscribe(context: JobContext, payload: { channel: string }) {
		const socketId = context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		const { channel } = payload;
		const [, moduleName, modelName, event, modelId] =
			/^([a-z]+)\.([a-z]+)\.([A-z]+)\.?([A-z0-9]+)?$/.exec(channel) ?? [];

		let permission = `event.${channel}`;

		if (
			moduleName === "model" &&
			modelName &&
			(modelId || event === "created")
		) {
			if (event === "created")
				permission = `event.model.${modelName}.created`;
			else permission = `data.${modelName}.findById.${modelId}`;
		}

		await context.assertPermission(permission);

		if (!this._subscriptions[channel])
			this._subscriptions[channel] = new Set();

		if (this._subscriptions[channel].has(socketId)) return;

		this._subscriptions[channel].add(socketId);

		if (this._subscriptions[channel].size === 1)
			await EventsModule.subscribe("event", channel, value =>
				this._subscriptionCallback(channel, value)
			);
	}

	public async subscribeMany(
		context: JobContext,
		payload: { channels: string[] }
	) {
		const { channels } = payload;

		await Promise.all(
			channels.map(channel =>
				context.executeJob("api", "subscribe", {
					channel
				})
			)
		);
	}

	public async unsubscribe(
		context: JobContext,
		payload: { channel: string }
	) {
		const { channel } = payload;

		const socketId = context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		if (
			!(
				this._subscriptions[channel] &&
				this._subscriptions[channel].has(socketId)
			)
		)
			return;

		this._subscriptions[channel].delete(socketId);

		if (this._subscriptions[channel].size === 0) {
			await EventsModule.unsubscribe("event", channel, value =>
				this._subscriptionCallback(channel, value)
			);

			delete this._subscriptions[channel];
		}
	}

	public async unsubscribeMany(
		context: JobContext,
		payload: { channels: string[] }
	) {
		const { channels } = payload;

		await Promise.all(
			channels.map(channel =>
				context.executeJob("api", "unsubscribe", {
					channel
				})
			)
		);
	}

	public async unsubscribeAll(context: JobContext) {
		const socketId = context.getSocketId();

		if (!socketId) throw new Error("No socketId specified");

		await Promise.all(
			Object.entries(this._subscriptions)
				.filter(([, socketIds]) => socketIds.has(socketId))
				.map(([channel]) =>
					context.executeJob("api", "unsubscribe", {
						channel
					})
				)
		);
	}

	private async _removeAllSubscriptions() {
		await Promise.all(
			Object.entries(this._subscriptions).map(
				async ([channel, socketIds]) => {
					const promises = [];
					for await (const socketId of socketIds.values()) {
						promises.push(
							new Job(
								"unsubscribe",
								"api",
								{
									channel
								},
								{ socketId }
							).execute()
						);
					}
					return Promise.all(promises);
				}
			)
		);
	}
}

export type APIModuleJobs = {
	[Property in keyof UniqueMethods<APIModule>]: {
		payload: Parameters<UniqueMethods<APIModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<APIModule>[Property]>>;
	};
};

export default new APIModule();
