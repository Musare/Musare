import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import doesModelExist from "@/modules/DataModule/permissions/doesModelExist";

export default abstract class MinifiedUserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "minifiedUsers";

	/**
	 * If a modelId was specified, any user can subscribe.
	 * If not, only admins can subscribe.
	 */
	protected static _hasPermission = doesModelExist;
}
