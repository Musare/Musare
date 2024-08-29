import News from "@models/News";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default class NewsDeletedEvent extends ModelDeletedEvent {
	protected static _model = News;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isNewsPublished;
}
