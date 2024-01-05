import CreateJob from "@/modules/DataModule/CreateJob";
import { Models } from "@/types/Models";

export default class Create extends CreateJob {
	protected static _modelName: keyof Models = "news";
}
