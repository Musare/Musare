import GetDataJob from "@/modules/DataModule/GetDataJob";
import Station from "../../Station";

export default class GetData extends GetDataJob {
	protected static _model = Station;
}
