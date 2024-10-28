import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import User from "../../User";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import isSelf from "@/modules/DataModule/permissions/modelPermissions/isSelf";

export default class FindById extends FindByIdJob {
	protected static _model = User;

	protected static _hasModelPermission = [isAdmin, isSelf];
}
