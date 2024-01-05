import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import isOwner from "@/modules/DataModule/permissions/isOwner";
import { Models } from "@/types/Models";

export default class DeleteById extends DeleteByIdJob {
	protected static _modelName: keyof Models = "stations";

	protected static _hasPermission = isOwner;
}
