import CreateJob from "@/modules/DataModule/CreateJob";
import isLoggedIn from "@/modules/DataModule/permissions/modelPermissions/isLoggedIn";

export default class Create extends CreateJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = isLoggedIn;
}
