import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import doesModelExist from "@/modules/DataModule/permissions/doesModelExist";

export default abstract class MinifiedUserDeletedEvent extends ModelDeletedEvent {
	protected static _modelName = "minifiedUsers";

	/**
	 * If a modelId was specified, any user can subscribe.
	 * If not, only admins can subscribe.
	 */
	protected static _hasPermission = doesModelExist;
}
