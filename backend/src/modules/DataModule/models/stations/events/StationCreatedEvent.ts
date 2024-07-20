import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class StationCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "stations";

	protected static _hasPermission = isAdmin;
}
