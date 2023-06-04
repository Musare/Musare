import JobContext from "../JobContext";
import BaseModule from "../BaseModule";
import { Jobs, Modules, UniqueMethods } from "../types/Modules";

export default class APIModule extends BaseModule {
	/**
	 * API Module
	 */
	public constructor() {
		super("api");

		this.dependentModules = ["data", "events", "websocket"];
	}

	/**
	 * startup - Startup api module
	 */
	public override async startup() {
		await super.startup();

		await super.started();
	}

	/**
	 * shutdown - Shutdown api module
	 */
	public override async shutdown() {
		await super.shutdown();
	}

	/**
	 * runJob - Run a job
	 */
	public async runJob<
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
		context: JobContext,
		{
			moduleName,
			jobName,
			payload,
			socketId,
			sessionId
		}: {
			moduleName: ModuleNameType;
			jobName: JobNameType;
			payload: PayloadType;
			socketId?: string;
			sessionId?: string;
		}
	): Promise<ReturnType> {
		let session;
		if (sessionId) {
			const Session = await context.executeJob(
				"data",
				"getModel",
				"session"
			);
			session = await Session.findOneAndUpdate(
				{ _id: sessionId },
				{ $addToSet: { socketIds: socketId } }
			);
		}

		return context.executeJob(moduleName, jobName, payload, { session });
	}
}

export type APIModuleJobs = {
	[Property in keyof UniqueMethods<APIModule>]: {
		payload: Parameters<UniqueMethods<APIModule>[Property]>[1];
		returns: Awaited<ReturnType<UniqueMethods<APIModule>[Property]>>;
	};
};
