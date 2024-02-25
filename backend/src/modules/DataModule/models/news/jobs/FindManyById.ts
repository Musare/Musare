import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";

export default class FindManyById extends FindManyByIdJob {
	protected static _modelName = "news";

	protected static _hasPermission = true;
}
