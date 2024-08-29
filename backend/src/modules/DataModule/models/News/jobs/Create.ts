import News from "@models/News";
import CreateJob from "@/modules/DataModule/CreateJob";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class Create extends CreateJob {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
