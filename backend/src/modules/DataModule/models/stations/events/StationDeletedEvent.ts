import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import isUnlisted from "@/modules/DataModule/permissions/isUnlisted";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import isOwner from "@/modules/DataModule/permissions/isOwner";

export default abstract class StationDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "stations";

	protected static _hasPermission = [
		isPublic,
		isUnlisted,
		isOwner // TODO only check isOwner for community stations, if owner = user id
	];
}
