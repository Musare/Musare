import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";

export default class FindById extends FindByIdJob {
	protected static _modelName = "stations";

	protected static _hasModelPermission = [
		isOwner,
		isDj,
		isPublic,
		isUnlisted
	];
}
