import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import User from "../../User";

export default abstract class UserUpdatedEvent extends ModelUpdatedEvent {
	protected static _model = User;

	protected static _hasPermission = isAdmin;
	// TODO maybe allow this for the current logged in user?
}
