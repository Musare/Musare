import GetDataJob from "@/modules/DataModule/GetDataJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class GetData extends GetDataJob {
	protected static _modelName = "users";

	protected static _hasPermission = isAdmin;
}
