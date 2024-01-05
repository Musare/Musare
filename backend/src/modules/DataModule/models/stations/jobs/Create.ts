import CreateJob from "@/modules/DataModule/CreateJob";
import isLoggedIn from "@/modules/DataModule/permissions/isLoggedIn";
import { Models } from "@/types/Models";

export default class Create extends CreateJob {
	protected static _modelName: keyof Models = "stations";

	protected static _hasPermission = isLoggedIn;
}
