import News from "@models/News";
import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class FindManyById extends FindManyByIdJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
