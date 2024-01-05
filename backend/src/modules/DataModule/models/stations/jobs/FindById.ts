import FindByIdJob from "@/modules/DataModule/FindByIdJob";
import { Models } from "@/types/Models";
import isDj from "@/modules/DataModule/permissions/isDj";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/isOwner";

export default class FindById extends FindByIdJob {
	protected static _modelName: keyof Models = "stations";

	protected static _hasPermission = [isOwner, isDj, isPublic, isUnlisted];
}
