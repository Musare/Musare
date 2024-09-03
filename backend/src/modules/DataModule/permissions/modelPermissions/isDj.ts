import { HydratedDocument } from "mongoose";
import { StationSchema } from "../../models/stations/schema";
import User from "../../models/User";

export default (model: HydratedDocument<StationSchema>, user?: User) =>
	model && user && model.djs.includes(user._id);
