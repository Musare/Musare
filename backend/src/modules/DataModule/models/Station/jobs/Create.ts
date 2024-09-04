import CreateJob from "@/modules/DataModule/CreateJob";
import isLoggedIn from "@/modules/DataModule/permissions/modelPermissions/isLoggedIn";
import Station from "../../Station";

export default class Create extends CreateJob {
	protected static _model = Station;

	protected static _hasModelPermission = isLoggedIn;
}
