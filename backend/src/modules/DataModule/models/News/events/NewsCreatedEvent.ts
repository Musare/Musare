import News from "@models/News";
import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default class NewsCreatedEvent extends ModelCreatedEvent {
	protected static _model = News;

	protected static _hasPermission = isAdmin;
}
