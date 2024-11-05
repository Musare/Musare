import ModelCreatedEvent from "@/modules/DataModule/ModelCreatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";
import User from "../../User";

export default abstract class UserCreatedEvent extends ModelCreatedEvent {
	protected static _model = User;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isSelf;
}
