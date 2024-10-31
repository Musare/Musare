import User from "@models/User";
import Session from "@models/Session";
import DataModuleJob from "@/modules/DataModule/DataModuleJob";
import isLoggedIn from "@/modules/DataModule/permissions/isLoggedIn";

export default class LogoutAll extends DataModuleJob {
	protected static _model = User;

	protected static _hasPermission = isLoggedIn;

	protected async _execute() {
		const user = await this._context.getUser();

		await Session.destroy({
			where: {
				userId: user._id
			},
			individualHooks: true
		});
	}
}
