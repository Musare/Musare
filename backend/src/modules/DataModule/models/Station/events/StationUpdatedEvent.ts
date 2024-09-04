import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isPublic from "@/modules/DataModule/permissions/modelPermissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/modelPermissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import Station from "../../Station";

export default abstract class StationUpdatedEvent extends ModelUpdatedEvent {
	protected static _model = Station;

	protected static _hasPermission = isAdmin;

	protected static _hasModelPermission = [
		isPublic,
		isUnlisted,
		isDj,
		isOwner // TODO only check isOwner for community stations, if owner = user id
	];
}
