import { HydratedDocument } from "mongoose";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import { MinifiedUserSchema } from "../schema";

export default abstract class MinifiedUserUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "minifiedUsers";

	// TODO make this function shared
	/**
	 * If a modelId was specified, any user can subscribe.
	 * If not, only admins can subscribe.
	 */
	protected static _hasPermission = (
		model: HydratedDocument<MinifiedUserSchema>
	) => {
		if (model) return true;
		return false;
	};
}
