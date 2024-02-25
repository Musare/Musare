import FindManyByIdJob from "@/modules/DataModule/FindManyByIdJob";
import isDj from "@/modules/DataModule/permissions/isDj";
import isPublic from "@/modules/DataModule/permissions/isPublic";
import isUnlisted from "@/modules/DataModule/permissions/isUnlisted";
import isOwner from "@/modules/DataModule/permissions/isOwner";

export default class FindManyById extends FindManyByIdJob {
	protected static _modelName = "stations";

	protected static _hasPermission = [isOwner, isDj, isPublic, isUnlisted];
}
