import DeleteByIdJob from "@/modules/DataModule/DeleteByIdJob";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import Station from "../../Station";

export default class DeleteById extends DeleteByIdJob {
	protected static _model = Station;

	protected static _hasModelPermission = isOwner;
}
