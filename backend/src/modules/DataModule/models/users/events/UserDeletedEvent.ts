import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class UserDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "users";

	protected static _hasPermission = isAdmin;
}
