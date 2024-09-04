import { StationPrivacy } from "@/modules/DataModule/models/Station/StationPrivacy";
import Station from "../../models/Station";

export default (model: Station) =>
	model && model?.privacy === StationPrivacy.PUBLIC;
