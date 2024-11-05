import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";
import User from "../../User";

export default abstract class UserDeletedEvent extends ModelDeletedEvent {
	protected static _model = User;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isSelf;
}
