import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import User from "../../User";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";

export default class DeleteById extends DeleteByIdJob {
	protected static _model = User;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = isSelf;
}
