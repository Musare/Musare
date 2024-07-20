import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class FindById extends FindByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
