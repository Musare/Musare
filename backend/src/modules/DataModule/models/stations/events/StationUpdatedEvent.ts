import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/isOwner";
import isDj from "@/modules/DataModule/permissions/isDj";

export default abstract class StationUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "stations";

	protected static _hasPermission = [
		isPublic,
		isUnlisted,
		isDj,
		isOwner // TODO only check isOwner for community stations, if owner = user id
	];
}
