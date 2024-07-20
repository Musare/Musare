import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import isAdmin from "@/modules/DataModule/permissions/isAdmin";
import doesModelExist from "@/modules/DataModule/permissions/modelPermissions/doesModelExist";

export default abstract class MinifiedUserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "minifiedUsers";

	protected static _hasPermission = isAdmin;

	/**
	 * If a modelId was specified, any user can subscribe.
	 * If not, only admins can subscribe.
	 */
	protected static _hasModelPermission = doesModelExist;
}
