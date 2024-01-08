import CacheModule from "@/modules/CacheModule";
import permissions from "@/modules/DataModule/models/users/permissions";
import { UserRole } from "../UserRole";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";

export default class GetPermissions extends DataModuleJob {
	protected static _modelName = "users";

	protected static _hasPermission = true;

	protected override async _authorize() {}

	protected async _execute() {
		const user = await this._context.getUser().catch(() => null);

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
}
