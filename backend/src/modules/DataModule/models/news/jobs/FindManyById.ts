import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class FindManyById extends FindManyByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
