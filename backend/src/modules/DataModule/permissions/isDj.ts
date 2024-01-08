import { HydratedDocument } from "mongoose";
import { StationSchema } from "../models/stations/schema";
import { UserSchema } from "../models/users/schema";

export default (
	model: HydratedDocument<StationSchema>,
	user?: HydratedDocument<UserSchema>
) => model && user && model.djs.includes(user._id);
