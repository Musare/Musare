import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class MinifiedUserCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "minifiedUsers";

	protected static _hasPermission = isAdmin;
}
