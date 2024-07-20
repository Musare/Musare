import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";

export default class UpdateById extends UpdateByIdJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = [isOwner, isDj];
}
