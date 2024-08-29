import News from "@models/News";
import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class FindById extends FindByIdJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
