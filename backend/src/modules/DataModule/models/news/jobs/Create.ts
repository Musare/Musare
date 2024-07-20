import CreateJob from "@/modules/DataModule/CreateJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class Create extends CreateJob {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
