import { HydratedDocument } from "mongoose";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import { MinifiedUserSchema } from "../schema";

export default abstract class MinifiedUserDeletedEvent extends ModelDeletedEvent {
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
