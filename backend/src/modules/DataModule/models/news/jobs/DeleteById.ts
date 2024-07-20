import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class DeleteById extends DeleteByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
