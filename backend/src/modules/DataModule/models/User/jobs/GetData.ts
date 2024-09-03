import GetDataJob from "@/modules/DataModule/GetDataJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import User from "../../User";

export default class GetData extends GetDataJob {
	protected static _model = User;

	protected static _hasPermission = isAdmin;
}
