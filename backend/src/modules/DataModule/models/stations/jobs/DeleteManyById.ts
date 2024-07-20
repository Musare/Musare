import DeleteManyByIdJob from "@/modules/DataModule/DeleteManyByIdJob";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";

export default class DeleteManyById extends DeleteManyByIdJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = isOwner;
}
