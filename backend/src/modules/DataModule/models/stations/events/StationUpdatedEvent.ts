import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/isOwner";

export default abstract class StationUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "stations";

	protected static _hasPermission = [
		isPublic,
		isUnlisted,
		isOwner // TODO only check isOwner for community stations, if owner = user id
	];
}
