import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import isDj from "@/modules/DataModule/permissions/isDj";
import isOwner from "@/modules/DataModule/permissions/isOwner";

export default class UpdateById extends UpdateByIdJob {
	protected static _modelName = "stations";

	protected static _hasPermission = [isOwner, isDj];
}
