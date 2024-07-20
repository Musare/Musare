import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";

export default class UpdateById extends UpdateByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
