import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default abstract class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isNewsPublished;
}
