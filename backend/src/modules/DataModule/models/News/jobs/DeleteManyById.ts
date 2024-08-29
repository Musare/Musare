import News from "@models/News";
import DeleteManyByIdJob from "@/modules/DataModule/DeleteManyByIdJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class DeleteManyById extends DeleteManyByIdJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
