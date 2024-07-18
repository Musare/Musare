import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isNewsPublished from "@/modules/DataModule/permissions/isNewsPublished";

export default abstract class NewsDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = isNewsPublished;
}
