import User from "@models/User";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isLoggedIn from "@/modules/DataModule/permissions/isLoggedIn";

export default class Logout extends DataModuleJob {
	protected static _model = User;

	protected static _hasPermission = isLoggedIn;

	protected async _execute() {
		await this._context.getSession()!.destroy();
	}
}
