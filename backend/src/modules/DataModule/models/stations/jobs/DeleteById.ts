import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";

export default class DeleteById extends DeleteByIdJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = isOwner;
}
