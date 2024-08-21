import DataModuleEvent from "@/modules/DataModule/DataModuleEvent";

export default abstract class NewsPublishedEvent extends DataModuleEvent {
	protected static _modelName = "news";

	protected static _name = "published";

	protected static _hasPermission = true;
}
