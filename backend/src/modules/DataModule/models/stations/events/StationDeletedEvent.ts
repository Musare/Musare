import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";

export default abstract class StationDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "stations";

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = [
		isPublic,
		isUnlisted,
		isDj,
		isOwner // TODO only check isOwner for community stations, if owner = user id
	];
}
