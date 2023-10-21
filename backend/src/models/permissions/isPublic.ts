import { StationPrivacy } from "@/models/schemas/stations/StationPrivacy";

export default model => model && model.privacy === StationPrivacy.PUBLIC;
