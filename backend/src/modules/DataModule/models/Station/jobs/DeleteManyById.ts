import DeleteManyByIdJob from "@/modules/DataModule/DeleteManyByIdJob";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import Station from "../../Station";

export default class DeleteManyById extends DeleteManyByIdJob {
	protected static _model = Station;

	protected static _hasModelPermission = isOwner;
}
