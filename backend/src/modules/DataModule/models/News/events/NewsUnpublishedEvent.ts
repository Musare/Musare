import News from "@models/News";
import DataModuleEvent from "@/modules/DataModule/DataModuleEvent";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default class NewsUnpublishedEvent extends DataModuleEvent {
	protected static _model = News;

	protected static _name = "unpublished";

	protected static _hasModelPermission = isNewsPublished;
}
