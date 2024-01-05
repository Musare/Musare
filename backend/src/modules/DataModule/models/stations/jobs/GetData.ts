import GetDataJob from "@/modules/DataModule/GetDataJob";
import { Models } from "@/types/Models";

export default class GetData extends GetDataJob {
	protected static _modelName: keyof Models = "stations";
}
