import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class NewsCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "news";

	protected static _hasPermission = isAdmin;
}
