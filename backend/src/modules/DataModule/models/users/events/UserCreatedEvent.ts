import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class UserCreatedEvent extends ModelCreatedEvent {
	protected static _modelName = "users";

	protected static _hasPermission = isAdmin;
}
