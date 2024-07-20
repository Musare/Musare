import { HydratedDocument } from "mongoose";
import { StationPrivacy } from "@/modules/DataModule/models/stations/StationPrivacy";
import { StationSchema } from "../../models/stations/schema";

export default (model: HydratedDocument<StationSchema>) =>
	model && model?.privacy === StationPrivacy.PUBLIC;
