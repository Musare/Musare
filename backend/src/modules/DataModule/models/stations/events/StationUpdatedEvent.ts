import { Schema, HydratedDocument } from "mongoose";
import ModelUpdatedEvent from "@/modules/DataModule/ModelUpdatedEvent";
import { StationPrivacy } from "../StationPrivacy";
import { StationType } from "../StationType";
import { StationSchema } from "../schema";
import { UserSchema } from "../../users/schema";

export default abstract class StationUpdatedEvent extends ModelUpdatedEvent {
	protected static _modelName = "stations";

	// TODO make this function shared
	protected static _hasPermission = (
		model: HydratedDocument<StationSchema>,
		user: HydratedDocument<UserSchema> | null
	) => {
		if (!model) return false;
		if (
			model.privacy === StationPrivacy.PUBLIC ||
			model.privacy === StationPrivacy.UNLISTED
		)
			return true;
		// If the station isn't public/unlisted, and the user isn't logged in, don't give permission
		if (!user) return false;
		if (
			model.type === StationType.COMMUNITY &&
			model.owner?.toString() === user._id.toString()
		)
			return true;

		return false;
	};
}
