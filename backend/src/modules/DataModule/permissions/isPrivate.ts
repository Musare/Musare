import { StationPrivacy } from "@/modules/DataModule/models/stations/StationPrivacy";

export default model => model && model.privacy === StationPrivacy.PRIVATE;
