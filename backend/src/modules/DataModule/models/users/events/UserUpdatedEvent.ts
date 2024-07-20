import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class UserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "users";

	protected static _hasPermission = isAdmin;
	// TODO maybe allow this for the current logged in user?
}
