import { StationPrivacy } from "../schemas/stations/StationPrivacy";

export default model => model && model.privacy === StationPrivacy.PUBLIC;
