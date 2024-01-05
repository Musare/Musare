import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import isDj from "@/modules/DataModule/permissions/isDj";
import isOwner from "@/modules/DataModule/permissions/isOwner";
import { Models } from "@/types/Models";

export default class UpdateById extends UpdateByIdJob {
	protected static _modelName: keyof Models = "stations";

	protected static _hasPermission = [isOwner, isDj];
}
