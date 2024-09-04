import UpdateByIdJob from "@/modules/DataModule/UpdateByIdJob";
import isDj from "@/modules/DataModule/permissions/modelPermissions/isDj";
import isOwner from "@/modules/DataModule/permissions/modelPermissions/isOwner";
import Station from "../../Station";

export default class UpdateById extends UpdateByIdJob {
	protected static _model = Station;

	protected static _hasModelPermission = [isOwner, isDj];
}
