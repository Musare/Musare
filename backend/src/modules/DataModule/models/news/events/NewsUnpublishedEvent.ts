import DataModuleEvent from "@/modules/DataModule/DataModuleEvent";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default abstract class NewsUnpublishedEvent extends DataModuleEvent {
	protected static _modelName = "news";

	protected static _name = "unpublished";

	protected static _hasModelPermission = isNewsPublished;
}
