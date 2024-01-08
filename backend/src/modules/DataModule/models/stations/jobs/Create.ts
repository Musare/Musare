import CreateJob from "@/modules/DataModule/CreateJob";
import isLoggedIn from "@/modules/DataModule/permissions/isLoggedIn";

export default class Create extends CreateJob {
	protected static _modelName = "stations";

	protected static _hasPermission = isLoggedIn;
}
