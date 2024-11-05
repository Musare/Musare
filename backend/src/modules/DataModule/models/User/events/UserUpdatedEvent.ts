import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";
import User from "../../User";

export default abstract class UserUpdatedEvent extends ModelUpdatedEvent {
	protected static _model = User;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isSelf;
}
