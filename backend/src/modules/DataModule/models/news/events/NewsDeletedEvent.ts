import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default abstract class NewsDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isNewsPublished;
}
