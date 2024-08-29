import News from "@models/News";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = News;

	protected static _modelName = "News";

	protected static _hasPermission = isAdmin;
}
