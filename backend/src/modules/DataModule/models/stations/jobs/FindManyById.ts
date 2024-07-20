import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";

export default class FindManyById extends FindManyByIdJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = [
		isOwner,
		isDj,
		isPublic,
		isUnlisted
	];
}
