import News from "@models/News";
import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class DeleteById extends DeleteByIdJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
