import News from "@models/News";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isNewsPublished from "@/modules/DataModule/permissions/modelPermissions/isNewsPublished";

export default class NewsUpdatedEvent extends ModelUpdatedEvent {
	protected static _model = News;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isNewsPublished;
}
