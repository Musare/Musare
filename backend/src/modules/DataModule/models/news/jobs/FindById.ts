import FindByIdJob from "@/modules/DataModule/FindByIdJob";

export default class FindById extends FindByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = true;
}
