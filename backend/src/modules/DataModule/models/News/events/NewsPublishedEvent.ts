import News from "@models/News";
import DataModuleEvent from "@/modules/DataModule/DataModuleEvent";

export default class NewsPublishedEvent extends DataModuleEvent {
	protected static _model = News;

	protected static _name = "published";

	protected static _hasPermission = true;
}
