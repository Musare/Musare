import { Schema, HydratedDocument } from "mongoose";
import ModelDeletedEvent from "@/modules/DataModule/ModelDeletedEvent";
import { StationSchema } from "../schema";
import { StationPrivacy } from "../StationPrivacy";
import { UserSchema } from "../../users/schema";
import { StationType } from "../StationType";

export default abstract class StationDeletedEvent extends ModelDeletedEvent {
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
