import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import Station from "../../Station";

export default class FindManyById extends FindManyByIdJob {
	protected static _model = Station;

	protected static _hasModelPermission = [
		isOwner,
		isDj,
		isPublic,
		isUnlisted
	];
}
