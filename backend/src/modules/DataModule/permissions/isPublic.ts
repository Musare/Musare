import { HydratedDocument, Schema } from "mongoose";
import { StationPrivacy } from "@/modules/DataModule/models/stations/StationPrivacy";

export default <
	ModelSchemaType extends Schema & { privacy?: StationPrivacy.PUBLIC }
>(
	model: HydratedDocument<ModelSchemaType>
) => model && model?.privacy === StationPrivacy.PUBLIC;
