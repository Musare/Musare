import { forEachIn } from "@common/utils/forEachIn";
import CacheModule from "@/modules/CacheModule";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import ModuleManager from "@/ModuleManager";
import Job from "@/Job";
import Event from "@/modules/EventsModule/Event";
import { UserRole } from "../UserRole";
import User from "../../User";

export type GetPermissionsResult = Record<string, boolean>;

/**
 * This jobs returns the static/pre-defined permissions for the current user/guest based on the user's role.
 * Permissions are cached. No cache invalidation machanism has been implemented yet, but it expires naturally after 6 minutes.
 */
export default class GetPermissions extends DataModuleJob {
	protected static _model = User;

	protected static _hasPermission = true;

	// _authorize calls GetPermissions and GetModelPermissions, so to avoid ending up in an infinite loop, just override it
	protected override async _authorize() {}

	protected async _execute(): Promise<GetPermissionsResult> {
		const user = await this._context.getUser().catch(() => null);

		const cacheKey = user
			? `user-permissions.${user._id}`
			: `user-permissions.guest`;
		const cachedPermissions = await CacheModule.get(cacheKey);
		if (cachedPermissions) return cachedPermissions;

		const permissions = await this._getPermissions(user);

		await CacheModule.set(cacheKey, permissions, 360);

		return permissions;
	}

	protected async _getPermissions(user: User | null) {
		const jobs = this._getAllJobs();
		const events = this._getAllEvents();

		const jobNames = Object.keys(jobs);
		const eventNames = Object.keys(events);

		const permissions: GetPermissionsResult =
			this._getFrontendViewPermissions(user);

		await forEachIn(jobNames, async jobName => {
			const job = jobs[jobName];
			const hasPermission = await job.hasPermission(user);
			if (hasPermission) {
				permissions[jobName] = true;
			}
		});

		await forEachIn(eventNames, async eventName => {
			const event = events[eventName];
			const hasPermission = await event.hasPermission(user);
			if (hasPermission) {
				permissions[eventName] = true;
			}
		});

		return permissions;
	}

	protected _getFrontendViewPermissions(
		user: User | null
	): Record<string, boolean> {
		if (!user) return {};

		const moderatorPermissions = {
			"admin.view": true,
			"admin.view.import": true,
			"admin.view.news": true,
			"admin.view.playlists": true,
			"admin.view.punishments": true,
			"admin.view.reports": true,
			"admin.view.songs": true,
			"admin.view.stations": true,
			"admin.view.users": true,
			"admin.view.youtubeVideos": true
		};

		if (user.role === UserRole.MODERATOR) return moderatorPermissions;

		const adminPermissions = {
			...moderatorPermissions,
			"admin.view.dataRequests": true,
			"admin.view.statistics": true,
			"admin.view.youtube": true
		};

		if (user.role === UserRole.ADMIN) return adminPermissions;

		return {};
	}

	protected _getAllJobs(): Record<string, typeof Job> {
		const modules = Object.entries(ModuleManager.getModules() ?? {});
		let jobs: (string | typeof Job)[][] = [];
		modules.forEach(([moduleName, module]) => {
			const moduleJobs = Object.entries(module.getJobs()).map(
				([jobName, job]) => [`${moduleName}.${jobName}`, job]
			);
			jobs = [...jobs, ...moduleJobs];
		});

		return Object.fromEntries(jobs);
	}

	protected _getAllEvents(): Record<string, typeof Event> {
		const modules = Object.entries(ModuleManager.getModules() ?? {});
		let events: (string | typeof Event)[][] = [];
		modules.forEach(([moduleName, module]) => {
			const moduleEvents = Object.entries(module.getEvents()).map(
				([eventName, event]) => [
					`event.${moduleName}.${eventName}`,
					event
				]
			);
			events = [...events, ...moduleEvents];
		});

		return Object.fromEntries(events);
	}
}
