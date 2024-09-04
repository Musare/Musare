import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import Station from "../../Station";

export default class FindById extends FindByIdJob {
	protected static _model = Station;

	protected static _hasModelPermission = [
		isOwner,
		isDj,
		isPublic,
		isUnlisted
	];
}
