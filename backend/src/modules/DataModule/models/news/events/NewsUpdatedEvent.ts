import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isNewsPublished from "@/modules/DataModule/permissions/isNewsPublished";

export default abstract class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = isNewsPublished;
}
